import { describe, it, expect, vi } from 'vitest'
import { createGraphClient } from './graphClient'
import { ApiError } from './apiError'

const token = () => Promise.resolve('tok')

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response
}

describe('graphClient', () => {
  it('sends bearer token and returns json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: [1] }))
    const client = createGraphClient(token, fetchImpl)
    const res = await client.get<{ value: number[] }>('/x')
    expect(res.value).toEqual([1])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://graph.microsoft.com/v1.0/x')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })
  it('throws ApiError with status on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, 403))
    const client = createGraphClient(token, fetchImpl)
    const err = (await client.get('/x').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
    expect(err.message).toBe('nope')
  })
  it('posts a $batch of GETs, twenty per request, and returns the sub-responses in call order', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const { requests } = JSON.parse(init.body as string) as { requests: { id: string; url: string }[] }
      return jsonResponse({
        responses: [...requests].reverse().map((r) => ({
          id: r.id,
          status: r.url.endsWith('/gone') ? 404 : 200,
          body: { url: r.url },
        })),
      })
    })
    const client = createGraphClient(token, fetchImpl as unknown as typeof fetch)
    const paths = [...Array.from({ length: 21 }, (_, i) => `/sites/${i}`), '/sites/gone']

    const results = await client.batchGet<{ url: string }>(paths)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://graph.microsoft.com/v1.0/$batch')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string).requests).toHaveLength(20)
    expect(JSON.parse(init.body as string).requests[0]).toEqual({ id: '0', method: 'GET', url: '/sites/0' })
    expect(results).toHaveLength(22)
    expect(results[0]).toEqual({ status: 200, body: { url: '/sites/0' } })
    expect(results[20]).toEqual({ status: 200, body: { url: '/sites/20' } })
    expect(results[21]).toEqual({ status: 404, body: { url: '/sites/gone' } })
  })

  it('reports a sub-response the batch envelope left out as status 0', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ responses: [] }))
    const client = createGraphClient(token, fetchImpl)
    expect(await client.batchGet(['/sites/x'])).toEqual([{ status: 0 }])
  })

  it('follows @odata.nextLink in getAllPages', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ value: [1], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/x?p=2' }))
      .mockResolvedValueOnce(jsonResponse({ value: [2] }))
    const client = createGraphClient(token, fetchImpl)
    expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
  })
})
