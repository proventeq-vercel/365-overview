import { describe, expect, it, vi } from 'vitest'
import { readConfig } from './config.js'
import { ProxyError } from './errors.js'
import { handleProxyRequest, type ProxyDeps, type ProxyRequest } from './handler.js'

const TENANT = '11111111-2222-4333-8444-555555555555'
const ORIGIN = 'http://localhost:5173'
const HOST = 'https://proxy.example'
const SITE = 'contoso.sharepoint.com,8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718,0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'

const caller = { tenantId: TENANT, objectId: 'oid', directoryRoles: [] }

function deps(overrides: Partial<ProxyDeps> = {}): ProxyDeps {
  return {
    config: readConfig({
      GRAPH_CLIENT_ID: 'app',
      GRAPH_CLIENT_SECRET: 's',
      PROXY_AUDIENCES: 'api://proxy',
      PROXY_ALLOWED_ORIGINS: ORIGIN,
    }),
    verifyCaller: vi.fn().mockResolvedValue(caller),
    appToken: vi.fn().mockResolvedValue('app-token'),
    fetchImpl: vi.fn().mockResolvedValue(new Response('{"value":[]}', { headers: { 'content-type': 'application/json' } })),
    log: vi.fn(),
    ...overrides,
  }
}

function request(init: Partial<ProxyRequest> & { headers?: Record<string, string> } = {}): ProxyRequest {
  const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    method: init.method ?? 'GET',
    url: init.url ?? `${HOST}/api/graph/v1.0/organization`,
    header: (name) => headers[name.toLowerCase()] ?? null,
    text: init.text ?? (() => Promise.resolve('')),
  }
}

const bodyOf = (response: { body: string }) => JSON.parse(response.body) as { error?: { code: string } }

describe('handleProxyRequest', () => {
  it('answers a preflight from an allowed origin and refuses one from anywhere else', async () => {
    const d = deps()
    const allowed = await handleProxyRequest(request({ method: 'OPTIONS', headers: { origin: ORIGIN } }), d)
    expect(allowed.status).toBe(204)
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN)
    expect(allowed.headers['access-control-allow-headers']).toBe('authorization, content-type')

    const refused = await handleProxyRequest(request({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), d)
    expect(refused.status).toBe(403)
    expect(refused.headers['access-control-allow-origin']).toBeUndefined()
    expect(d.verifyCaller).not.toHaveBeenCalled()
  })

  it('verifies the caller before it looks at the route, so the allowlist cannot be probed anonymously', async () => {
    const d = deps({ verifyCaller: vi.fn().mockRejectedValue(new ProxyError(401, 'Unauthorized', 'no token')) })
    const response = await handleProxyRequest(request({ url: `${HOST}/api/graph/v1.0/me` }), d)
    expect(response.status).toBe(401)
    expect(bodyOf(response).error?.code).toBe('Unauthorized')
    expect(d.appToken).not.toHaveBeenCalled()
    expect(d.fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['a path outside the allowlist', `${HOST}/api/graph/v1.0/me`],
    ['an unknown version', `${HOST}/api/graph/v2.0/organization`],
    ['no path', `${HOST}/api/graph/v1.0`],
    ['a different route', `${HOST}/api/other/v1.0/organization`],
  ])('rejects %s with 404 before acquiring an app token', async (_label, url) => {
    const d = deps()
    const response = await handleProxyRequest(request({ url }), d)
    expect(response.status).toBe(404)
    expect(bodyOf(response).error?.code).toBe('RouteNotAllowed')
    expect(d.appToken).not.toHaveBeenCalled()
  })

  it('rejects a POST that is not a batch', async () => {
    const response = await handleProxyRequest(request({ method: 'POST', url: `${HOST}/api/graph/v1.0/organization` }), deps())
    expect(response.status).toBe(404)
  })

  it('forwards an allowed GET with an app token for the caller tenant and rewrites links to its own host', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/subscribedSkus?$skiptoken=9' }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    const d = deps({ fetchImpl })
    const response = await handleProxyRequest(
      request({ url: `${HOST}/api/graph/v1.0/subscribedSkus?$top=50`, headers: { origin: ORIGIN, authorization: 'Bearer user' } }),
      d,
    )
    expect(d.verifyCaller).toHaveBeenCalledWith('Bearer user')
    expect(d.appToken).toHaveBeenCalledWith(TENANT)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/subscribedSkus?$top=50')
    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(ORIGIN)
    expect(JSON.parse(response.body)['@odata.nextLink']).toBe(`${HOST}/api/graph/v1.0/subscribedSkus?$skiptoken=9`)
  })

  it('prefers PROXY_PUBLIC_URL over the request host for rewritten links', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/sites/delta?token=1' }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    const d = deps({ fetchImpl })
    d.config = { ...d.config, publicUrl: 'https://public.example' }
    const response = await handleProxyRequest(request({ url: `${HOST}/api/graph/v1.0/sites/delta` }), d)
    expect(JSON.parse(response.body)['@odata.deltaLink']).toBe('https://public.example/api/graph/v1.0/sites/delta?token=1')
  })

  it('forwards a validated batch as a rebuilt envelope', async () => {
    const d = deps()
    const text = () =>
      Promise.resolve(
        JSON.stringify({ requests: [{ id: 'a', method: 'GET', url: `/sites/${SITE}?$select=id`, headers: { 'x-leak': '1' } }] }),
      )
    await handleProxyRequest(request({ method: 'POST', url: `${HOST}/api/graph/v1.0/$batch`, text }), d)
    const [url, init] = (d.fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://graph.microsoft.com/v1.0/$batch')
    expect(JSON.parse(init.body as string)).toEqual({ requests: [{ id: 'a', method: 'GET', url: `/sites/${SITE}?$select=id` }] })
  })

  it('returns an invalid batch as 400 without touching Graph', async () => {
    const d = deps()
    const text = () => Promise.resolve(JSON.stringify({ requests: [{ id: 'a', method: 'GET', url: '/me' }] }))
    const response = await handleProxyRequest(request({ method: 'POST', url: `${HOST}/api/graph/v1.0/$batch`, text }), d)
    expect(response.status).toBe(404)
    expect(d.fetchImpl).not.toHaveBeenCalled()
  })

  it('adds CORS headers to error responses for an allowed origin', async () => {
    const d = deps({ appToken: vi.fn().mockRejectedValue(new ProxyError(403, 'AdminConsentRequired', 'consent')) })
    const response = await handleProxyRequest(request({ headers: { origin: ORIGIN } }), d)
    expect(response.status).toBe(403)
    expect(bodyOf(response).error?.code).toBe('AdminConsentRequired')
    expect(response.headers['access-control-allow-origin']).toBe(ORIGIN)
  })

  it('turns an unexpected failure into a logged 500 that leaks nothing', async () => {
    const log = vi.fn()
    const d = deps({ appToken: vi.fn().mockRejectedValue(new Error('private key is corrupt: -----BEGIN')), log })
    const response = await handleProxyRequest(request(), d)
    expect(response.status).toBe(500)
    expect(bodyOf(response).error?.code).toBe('InternalError')
    expect(response.body).not.toContain('BEGIN')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('private key is corrupt'))
  })
})
