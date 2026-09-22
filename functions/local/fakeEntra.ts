import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID, X509Certificate } from 'node:crypto'
import { decodeProtectedHeader, jwtVerify, SignJWT } from 'jose'
import { thumbprintToX5t } from '../src/proxy/appToken.js'
import { DEFAULT_REQUIRED_DIRECTORY_ROLES } from '../src/proxy/config.js'
import type { LocalKeyPair } from './keys.js'

export const LOCAL_TENANT_ID = '11111111-2222-4333-8444-555555555555'
export const LOCAL_USER_OID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const ISSUER_KID = 'local-entra-signing-key'
const USER_TOKEN_LIFETIME_S = 3600
const APP_TOKEN_LIFETIME_S = 3599

export interface RegisteredApp {
  clientId: string
  certificatePem: string
  clientSecret?: string
}

export interface FakeEntraOptions {
  issuerKey: LocalKeyPair
  app: RegisteredApp
  proxyAudience: string
  proxyScope: string
  port?: number
  unconsentedTenantIds?: string[]
}

export interface UserTokenClaims {
  tenantId?: string
  audience?: string
  scope?: string
  oid?: string
  wids?: string[]
  expiresInSeconds?: number
  issuer?: string
}

export interface FakeEntra {
  url: string
  tokenRequests: { tenantId: string; credential: 'assertion' | 'secret' }[]
  issueUserToken(claims?: UserTokenClaims): Promise<string>
  close(): Promise<void>
}

const readBody = (request: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = ''
    request.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    request.on('end', () => resolve(data))
  })

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  })
  response.end(JSON.stringify(body))
}

const appToken = (tenantId: string, serial: number) => `local-app-token.${tenantId}.${serial}`

export async function startFakeEntra(options: FakeEntraOptions): Promise<FakeEntra> {
  const tokenRequests: FakeEntra['tokenRequests'] = []
  const unconsented = new Set((options.unconsentedTenantIds ?? []).map((id) => id.toLowerCase()))
  let url = ''

  const issueUserToken = (claims: UserTokenClaims = {}) => {
    const tenantId = claims.tenantId ?? LOCAL_TENANT_ID
    const now = Math.floor(Date.now() / 1000)
    return new SignJWT({
      tid: tenantId,
      oid: claims.oid ?? LOCAL_USER_OID,
      scp: claims.scope ?? options.proxyScope,
      wids: claims.wids ?? DEFAULT_REQUIRED_DIRECTORY_ROLES,
      name: 'Local Admin',
      preferred_username: 'admin@local.test',
      ver: '2.0',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: ISSUER_KID })
      .setIssuer(claims.issuer ?? `${url}/${tenantId}/v2.0`)
      .setAudience(claims.audience ?? options.proxyAudience)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + (claims.expiresInSeconds ?? USER_TOKEN_LIFETIME_S))
      .setJti(randomUUID())
      .sign(options.issuerKey.privateKey)
  }

  const registeredCertificate = new X509Certificate(options.app.certificatePem)
  const registeredX5t = thumbprintToX5t(registeredCertificate.fingerprint.replace(/:/g, '').toLowerCase())

  async function verifyAssertion(assertion: string, tokenUrl: string): Promise<boolean> {
    try {
      const header = decodeProtectedHeader(assertion)
      if (header.x5t !== registeredX5t) return false
      await jwtVerify(assertion, registeredCertificate.publicKey, {
        algorithms: ['RS256'],
        issuer: options.app.clientId,
        subject: options.app.clientId,
        audience: tokenUrl,
      })
      return true
    } catch {
      return false
    }
  }

  async function tokenEndpoint(request: IncomingMessage, response: ServerResponse, tenantId: string) {
    const form = new URLSearchParams(await readBody(request))
    const tokenUrl = `${url}/${tenantId}/oauth2/v2.0/token`
    const fail = (error: string, description: string) =>
      json(response, 400, { error, error_description: description })

    if (form.get('grant_type') !== 'client_credentials') return fail('unsupported_grant_type', 'grant_type')
    if (!form.get('scope')?.endsWith('/.default')) return fail('invalid_scope', 'scope must be .default')
    if (form.get('client_id') !== options.app.clientId) {
      return fail('unauthorized_client', 'AADSTS700016: Application not found in the directory')
    }
    if (unconsented.has(tenantId.toLowerCase())) {
      return fail('unauthorized_client', `AADSTS700016: Application with identifier '${options.app.clientId}' was not found in the directory '${tenantId}'.`)
    }
    const assertion = form.get('client_assertion')
    const secret = form.get('client_secret')
    if (assertion) {
      if (!(await verifyAssertion(assertion, tokenUrl))) {
        return fail('invalid_client', 'AADSTS700027: Client assertion failed signature validation')
      }
      tokenRequests.push({ tenantId, credential: 'assertion' })
    } else if (secret) {
      if (secret !== options.app.clientSecret) {
        return fail('invalid_client', 'AADSTS7000215: Invalid client secret provided')
      }
      tokenRequests.push({ tenantId, credential: 'secret' })
    } else {
      return fail('invalid_client', 'AADSTS7000218: client_assertion or client_secret required')
    }
    json(response, 200, {
      token_type: 'Bearer',
      expires_in: APP_TOKEN_LIFETIME_S,
      access_token: appToken(tenantId, tokenRequests.length),
    })
  }

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', url)
    const tokenMatch = /^\/([^/]+)\/oauth2\/v2\.0\/token$/.exec(requestUrl.pathname)
    if (request.method === 'GET' && requestUrl.pathname === '/common/discovery/v2.0/keys') {
      return json(response, 200, { keys: [options.issuerKey.publicJwk] })
    }
    if (request.method === 'POST' && tokenMatch) {
      return tokenEndpoint(request, response, tokenMatch[1])
    }
    if (request.method === 'GET' && requestUrl.pathname === '/local/user-token') {
      const roles = requestUrl.searchParams.get('roles')
      return json(response, 200, {
        token_type: 'Bearer',
        expires_in: USER_TOKEN_LIFETIME_S,
        access_token: await issueUserToken({
          tenantId: requestUrl.searchParams.get('tenant') ?? undefined,
          wids: roles === null ? undefined : roles.split(',').filter(Boolean),
        }),
      })
    }
    json(response, 404, { error: 'not_found', error_description: requestUrl.pathname })
  })

  await new Promise<void>((resolve) => server.listen(options.port ?? 0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  return {
    url,
    tokenRequests,
    issueUserToken,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
