import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HttpRequest, InvocationContext } from '@azure/functions'

vi.mock('@azure/functions', () => ({ app: { http: vi.fn() } }))

const ORIGIN = 'http://localhost:5173'

const request = (method: string) =>
  ({
    method,
    url: 'https://proxy.example/api/graph/v1.0/organization',
    headers: new Headers({ origin: ORIGIN }),
    text: () => Promise.resolve(''),
  }) as unknown as HttpRequest

const context = () => ({ error: vi.fn() }) as unknown as InvocationContext

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('graphProxy on a misconfigured host', () => {
  it('still answers the browser with CORS, so the app can show that the proxy is misconfigured', async () => {
    vi.stubEnv('PROXY_ALLOWED_ORIGINS', ORIGIN)
    vi.stubEnv('GRAPH_CLIENT_ID', '')
    const { graphProxy } = await import('./graphProxy.js')

    const preflight = await graphProxy(request('OPTIONS'), context())
    expect(preflight.status).toBe(204)
    expect((preflight.headers as Record<string, string>)['access-control-allow-origin']).toBe(ORIGIN)

    const log = context()
    const response = await graphProxy(request('GET'), log)
    expect(response.status).toBe(500)
    expect((response.headers as Record<string, string>)['access-control-allow-origin']).toBe(ORIGIN)
    expect(JSON.parse(response.body as string)).toMatchObject({ error: { code: 'InvalidConfiguration' } })
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('GRAPH_CLIENT_ID'))
  })
})
