import { randomUUID } from 'node:crypto'
import { decodeJwt, importPKCS8, SignJWT, type CryptoKey } from 'jose'
import type { GraphCredential, ProxyConfig } from './config.js'
import { ProxyError } from './errors.js'

export type AppTokenSource = (tenantId: string) => Promise<string>

interface CachedToken {
  token: string
  expiresAt: number
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

const REFRESH_SKEW_MS = 60_000
const FALLBACK_LIFETIME_S = 300
const MAX_CACHED_TENANTS = 200
const ASSERTION_LIFETIME_S = 600
const CONSENT_ERROR_CODES = ['AADSTS700016', 'AADSTS65001', 'AADSTS650052']

export const REQUIRED_APPLICATION_PERMISSIONS = ['Reports.Read.All', 'Sites.Read.All', 'Organization.Read.All'] as const

function grantedRoles(accessToken: string): string[] {
  try {
    const { roles } = decodeJwt(accessToken)
    return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : []
  } catch {
    return []
  }
}

export function missingApplicationPermissions(accessToken: string): string[] {
  const granted = new Set(grantedRoles(accessToken))
  return REQUIRED_APPLICATION_PERMISSIONS.filter((permission) => !granted.has(permission))
}

export const tokenEndpoint = (authorityHost: string, tenantId: string) =>
  `${authorityHost}/${tenantId}/oauth2/v2.0/token`

export const thumbprintToX5t = (thumbprintHex: string) =>
  Buffer.from(thumbprintHex.replace(/[^0-9a-f]/gi, ''), 'hex').toString('base64url')

export async function buildClientAssertion(
  clientId: string,
  audience: string,
  credential: Extract<GraphCredential, { kind: 'certificate' }>,
  key: CryptoKey,
  nowMs = Date.now(),
): Promise<string> {
  const now = Math.floor(nowMs / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', x5t: thumbprintToX5t(credential.thumbprintHex) })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(audience)
    .setJti(randomUUID())
    .setNotBefore(now)
    .setIssuedAt(now)
    .setExpirationTime(now + ASSERTION_LIFETIME_S)
    .sign(key)
}

function tokenError(status: number, body: TokenResponse): ProxyError {
  const description = body.error_description ?? body.error ?? `HTTP ${status}`
  if (CONSENT_ERROR_CODES.some((code) => description.includes(code))) {
    return new ProxyError(
      403,
      'AdminConsentRequired',
      'An administrator of this tenant has not consented to the application yet.',
    )
  }
  return new ProxyError(
    502,
    'TokenAcquisitionFailed',
    `Entra refused the application token: ${description.split('\n')[0].slice(0, 300)}`,
  )
}

export function createAppTokenSource(
  config: ProxyConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): AppTokenSource {
  const cache = new Map<string, CachedToken>()
  const inFlight = new Map<string, Promise<string>>()
  let signingKey: Promise<CryptoKey> | null = null

  const key = (credential: Extract<GraphCredential, { kind: 'certificate' }>) => {
    signingKey ??= importPKCS8(credential.privateKeyPem, 'RS256')
    return signingKey
  }

  function evictStaleTokens() {
    for (const [tenant, entry] of cache) {
      if (entry.expiresAt <= now()) cache.delete(tenant)
    }
    for (const tenant of cache.keys()) {
      if (cache.size < MAX_CACHED_TENANTS) break
      cache.delete(tenant)
    }
  }

  async function credentialParams(audience: string): Promise<Record<string, string>> {
    const { credential } = config
    if (credential.kind === 'secret') return { client_secret: credential.clientSecret }
    return {
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: await buildClientAssertion(
        config.graphClientId,
        audience,
        credential,
        await key(credential),
        now(),
      ),
    }
  }

  async function acquire(tenantId: string): Promise<string> {
    const endpoint = tokenEndpoint(config.authorityHost, tenantId)
    const body = new URLSearchParams({
      client_id: config.graphClientId,
      grant_type: 'client_credentials',
      scope: `${config.graphOrigin}/.default`,
      ...(await credentialParams(endpoint)),
    })
    let response: Response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new ProxyError(502, 'TokenAcquisitionFailed', `Entra was unreachable: ${reason}`)
    }
    const payload = (await response.json().catch(() => ({}))) as TokenResponse
    if (!response.ok || !payload.access_token) throw tokenError(response.status, payload)
    const missing = missingApplicationPermissions(payload.access_token)
    if (missing.length > 0) {
      throw new ProxyError(
        403,
        'AdminConsentRequired',
        `An administrator of this tenant has not granted the application permissions ${missing.join(', ')} yet.`,
      )
    }
    const lifetimeMs = (payload.expires_in && payload.expires_in > 0 ? payload.expires_in : FALLBACK_LIFETIME_S) * 1000
    evictStaleTokens()
    cache.set(tenantId, { token: payload.access_token, expiresAt: now() + lifetimeMs })
    return payload.access_token
  }

  return async (tenantId) => {
    const cached = cache.get(tenantId)
    if (cached && cached.expiresAt - REFRESH_SKEW_MS > now()) return cached.token
    let pending = inFlight.get(tenantId)
    if (!pending) {
      pending = acquire(tenantId).finally(() => inFlight.delete(tenantId))
      inFlight.set(tenantId, pending)
    }
    return pending
  }
}
