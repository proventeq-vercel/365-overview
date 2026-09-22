import { decodeProtectedHeader, jwtVerify } from 'jose'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createHash, createPublicKey, X509Certificate } from 'node:crypto'
import { generateLocalAppCertificate, type LocalAppCertificate } from '../../local/keys.js'
import { createAppTokenSource, tokenEndpoint } from './appToken.js'
import { readConfig } from './config.js'
import type { ProxyError } from './errors.js'

const rejection = async (pending: Promise<unknown>): Promise<ProxyError> => {
  try {
    await pending
  } catch (error) {
    return error as ProxyError
  }
  throw new Error('the call resolved instead of failing')
}

const TENANT = '11111111-2222-4333-8444-555555555555'
const OTHER = '22222222-2222-4333-8444-555555555555'
const CLIENT_ID = 'graph-app'

let appCertificate: LocalAppCertificate

beforeAll(() => {
  appCertificate = generateLocalAppCertificate('app-token-test')
})

const certEnv = () => ({
  GRAPH_CLIENT_ID: CLIENT_ID,
  GRAPH_CERT_PEM: appCertificate.pemBundle,
  PROXY_AUDIENCES: 'api://proxy',
  PROXY_ALLOWED_ORIGINS: 'http://localhost:5173',
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const tokenReply = (token: string, expiresIn = 3599) =>
  jsonResponse({ token_type: 'Bearer', access_token: token, expires_in: expiresIn })

const formOf = (init: RequestInit | undefined) => new URLSearchParams(init?.body as URLSearchParams)

describe('createAppTokenSource', () => {
  it('posts a client-credentials request signed with the certificate', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenReply('app-1'))
    const config = readConfig(certEnv())
    const source = createAppTokenSource(config, fetchImpl)

    expect(await source(TENANT)).toBe('app-1')
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(tokenEndpoint('https://login.microsoftonline.com', TENANT))
    const form = formOf(init)
    expect(form.get('grant_type')).toBe('client_credentials')
    expect(form.get('client_id')).toBe(CLIENT_ID)
    expect(form.get('scope')).toBe('https://graph.microsoft.com/.default')
    expect(form.get('client_assertion_type')).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    expect(form.get('client_secret')).toBeNull()

    const assertion = form.get('client_assertion') as string
    const x5t = createHash('sha1').update(new X509Certificate(appCertificate.certificatePem).raw).digest('base64url')
    expect(decodeProtectedHeader(assertion)).toMatchObject({ alg: 'RS256', typ: 'JWT', x5t })
    const { payload } = await jwtVerify(assertion, createPublicKey(appCertificate.certificatePem), { issuer: CLIENT_ID, subject: CLIENT_ID, audience: url })
    expect(payload.jti).toBeTruthy()
    expect((payload.exp ?? 0) - (payload.nbf ?? 0)).toBe(600)
  })

  it('posts the client secret when that is the configured credential', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenReply('app-1'))
    const config = readConfig({ ...certEnv(), GRAPH_CERT_PEM: '', GRAPH_CLIENT_SECRET: 's3cret' })
    await createAppTokenSource(config, fetchImpl)(TENANT)
    const form = formOf(fetchImpl.mock.calls[0][1] as RequestInit)
    expect(form.get('client_secret')).toBe('s3cret')
    expect(form.get('client_assertion')).toBeNull()
  })

  it('caches a token per tenant until a minute before it expires', async () => {
    let now = 1_000_000
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenReply('a-1', 600))
      .mockResolvedValueOnce(tokenReply('b-1', 600))
      .mockResolvedValueOnce(tokenReply('a-2', 600))
    const source = createAppTokenSource(readConfig(certEnv()), fetchImpl, () => now)

    expect(await source(TENANT)).toBe('a-1')
    expect(await source(TENANT)).toBe('a-1')
    expect(await source(OTHER)).toBe('b-1')
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    now += 539_000
    expect(await source(TENANT)).toBe('a-1')
    now += 2_000
    expect(await source(TENANT)).toBe('a-2')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('shares one in-flight request between concurrent callers of a tenant', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(tokenReply('shared')), 5)),
    )
    const source = createAppTokenSource(readConfig(certEnv()), fetchImpl)
    const tokens = await Promise.all([source(TENANT), source(TENANT), source(TENANT)])
    expect(tokens).toEqual(['shared', 'shared', 'shared'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps a tenant without admin consent to 403 AdminConsentRequired', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'unauthorized_client', error_description: `AADSTS700016: Application with identifier '${CLIENT_ID}' was not found in the directory` }, 400),
    )
    const error = await rejection(createAppTokenSource(readConfig(certEnv()), fetchImpl)(TENANT))
    expect(error.status).toBe(403)
    expect(error.code).toBe('AdminConsentRequired')
  })

  it('reports any other token failure as 502 without echoing the whole description', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'invalid_client', error_description: 'AADSTS700027: Client assertion failed signature validation\nTrace ID: abc' }, 401),
    )
    const error = await rejection(createAppTokenSource(readConfig(certEnv()), fetchImpl)(TENANT))
    expect(error.status).toBe(502)
    expect(error.code).toBe('TokenAcquisitionFailed')
    expect(error.message).toContain('AADSTS700027')
    expect(error.message).not.toContain('Trace ID')
  })

  it('does not cache a failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'temporarily_unavailable' }, 503))
      .mockResolvedValueOnce(tokenReply('after-retry'))
    const source = createAppTokenSource(readConfig(certEnv()), fetchImpl)
    await expect(source(TENANT)).rejects.toMatchObject({ code: 'TokenAcquisitionFailed' })
    expect(await source(TENANT)).toBe('after-retry')
  })

  it('reports an unreachable authority as 502', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const error = await rejection(createAppTokenSource(readConfig(certEnv()), fetchImpl)(TENANT))
    expect(error.status).toBe(502)
    expect(error.message).toContain('fetch failed')
  })
})
