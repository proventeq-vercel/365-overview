import { describe, expect, it, vi } from 'vitest'
import type { ProxyError } from './errors.js'
import { forwardBatch, forwardGet, graphUrl, rewriteGraphLinks } from './forward.js'

const GRAPH = 'https://graph.microsoft.com'
const PROXY = 'https://proxy.example/api/graph'

const options = (fetchImpl: typeof fetch) => ({
  graphOrigin: GRAPH,
  proxyGraphBase: PROXY,
  appToken: 'app-token',
  fetchImpl,
})

const reply = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'application/json; odata.metadata=minimal', ...headers } })

describe('rewriteGraphLinks', () => {
  it('points nextLink and deltaLink at the proxy, anywhere in the document', () => {
    const rewritten = rewriteGraphLinks(
      {
        '@odata.nextLink': `${GRAPH}/beta/reports/x?$skiptoken=1`,
        responses: [{ body: { '@odata.deltaLink': `${GRAPH}/v1.0/sites/delta?token=latest` } }],
        value: [{ webUrl: `${GRAPH}/not-a-link` }],
      },
      GRAPH,
      PROXY,
    )
    expect(rewritten).toEqual({
      '@odata.nextLink': `${PROXY}/beta/reports/x?$skiptoken=1`,
      responses: [{ body: { '@odata.deltaLink': `${PROXY}/v1.0/sites/delta?token=latest` } }],
      value: [{ webUrl: `${GRAPH}/not-a-link` }],
    })
  })

  it('leaves a link that does not point at Graph alone', () => {
    const doc = { '@odata.nextLink': 'https://evil.example/v1.0/x' }
    expect(rewriteGraphLinks(doc, GRAPH, PROXY)).toEqual(doc)
  })
})

describe('graphUrl', () => {
  it('encodes each path segment the way Graph links do and keeps the query as given', () => {
    expect(graphUrl(GRAPH, { version: 'beta', path: "reports/getSharePointSiteUsageDetail(period='D180')", search: '?$format=application/json' })).toBe(
      `${GRAPH}/beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json`,
    )
    expect(graphUrl(GRAPH, { version: 'v1.0', path: 'sites/a,b,c', search: '' })).toBe(`${GRAPH}/v1.0/sites/a%2Cb%2Cc`)
    expect(graphUrl(GRAPH, { version: 'v1.0', path: 'sites/a b/x', search: '' })).toBe(`${GRAPH}/v1.0/sites/a%20b/x`)
  })
})

describe('forwardGet', () => {
  it('sends the app token, forwards only content-type and retry-after, and rewrites links', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      reply(JSON.stringify({ value: [1], '@odata.nextLink': `${GRAPH}/v1.0/subscribedSkus?$skiptoken=2` }), 200, {
        'retry-after': '3',
        'request-id': 'secret-trace',
        'set-cookie': 'nope',
      }),
    )
    const response = await forwardGet({ version: 'v1.0', path: 'subscribedSkus', search: '' }, options(fetchImpl))
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${GRAPH}/v1.0/subscribedSkus`)
    expect(init.headers).toMatchObject({ authorization: 'Bearer app-token', accept: 'application/json' })
    expect(init.redirect).toBe('manual')
    expect(response.status).toBe(200)
    expect(response.headers).toEqual({ 'content-type': 'application/json; odata.metadata=minimal', 'retry-after': '3' })
    expect(JSON.parse(response.body)).toEqual({ value: [1], '@odata.nextLink': `${PROXY}/v1.0/subscribedSkus?$skiptoken=2` })
  })

  it('passes a Graph error status and body through untouched', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply('{"error":{"code":"itemNotFound","message":"gone"}}', 404))
    const response = await forwardGet({ version: 'v1.0', path: 'sites/x', search: '' }, options(fetchImpl))
    expect(response.status).toBe(404)
    expect(response.body).toBe('{"error":{"code":"itemNotFound","message":"gone"}}')
  })

  it('returns a non-JSON body verbatim', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('a,b\n1,2', { headers: { 'content-type': 'text/csv' } }))
    const response = await forwardGet({ version: 'v1.0', path: 'organization', search: '' }, options(fetchImpl))
    expect(response.body).toBe('a,b\n1,2')
  })

  it('reports a network failure as 502 GraphUnreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const error = await forwardGet({ version: 'v1.0', path: 'organization', search: '' }, options(fetchImpl)).catch((e) => e as ProxyError)
    expect(error.status).toBe(502)
    expect(error.code).toBe('GraphUnreachable')
  })
})

describe('forwardBatch', () => {
  it('posts a rebuilt batch envelope to $batch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply('{"responses":[]}'))
    await forwardBatch([{ id: '1', method: 'GET', url: '/sites/a?$select=id' }], options(fetchImpl))
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${GRAPH}/v1.0/$batch`)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ requests: [{ id: '1', method: 'GET', url: '/sites/a?$select=id' }] })
  })
})
