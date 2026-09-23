import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createGraphClient,
  retryAfterMs,
  DEFAULT_RETRY_AFTER_MS,
  MAX_RETRY_AFTER_MS,
  MAX_THROTTLE_RETRIES,
} from './graphClient'
import { ApiError } from './apiError'

const token = () => Promise.resolve('tok')

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status < 400,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  } as Response
}

const batchRequests = (init: RequestInit) =>
  (JSON.parse(init.body as string) as { requests: { id: string; url: string }[] }).requests

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
  it('sends every call to the configured origin, keeping a versioned path as given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: [], responses: [] }))
    const proxy = 'http://127.0.0.1:7071/api/graph'
    const client = createGraphClient(token, fetchImpl, proxy)
    await client.get('/organization')
    await client.getAllPages("/beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json")
    await client.batchGet(['/sites/a'])
    await client.get(`${proxy}/v1.0/subscribedSkus?$skiptoken=2`)
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      `${proxy}/v1.0/organization`,
      `${proxy}/beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json`,
      `${proxy}/v1.0/$batch`,
      `${proxy}/v1.0/subscribedSkus?$skiptoken=2`,
    ])
  })
  it('throws ApiError with status on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, 403))
    const client = createGraphClient(token, fetchImpl)
    const err = (await client.get('/x').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
    expect(err.message).toBe('nope')
    expect(err.code).toBeNull()
  })
  it('keeps the error code a Graph-shaped body carries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'AdminConsentRequired', message: 'consent first' } }, 403),
    )
    const err = (await createGraphClient(token, fetchImpl).get('/x').catch((e) => e)) as ApiError
    expect(err.code).toBe('AdminConsentRequired')
    expect(err.message).toBe('consent first')
  })
  it('marks a failure from the proxy as app-only and one from Graph itself as delegated', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'Authorization_RequestDenied' } }, 403))
    const viaProxy = (await createGraphClient(token, fetchImpl, 'https://proxy.example/api/graph')
      .get('/x')
      .catch((e) => e)) as ApiError
    const direct = (await createGraphClient(token, fetchImpl).get('/x').catch((e) => e)) as ApiError
    expect(viaProxy.appOnly).toBe(true)
    expect(direct.appOnly).toBe(false)
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

  describe('throttling', () => {
    afterEach(() => vi.useRealTimers())

    it('waits Retry-After seconds and repeats a throttled request', async () => {
      vi.useFakeTimers()
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(jsonResponse({ error: { message: 'slow down' } }, 429, { 'Retry-After': '3' }))
        .mockResolvedValueOnce(jsonResponse({ value: [1] }))
      const client = createGraphClient(token, fetchImpl)

      const pending = client.get<{ value: number[] }>('/x')
      await vi.advanceTimersByTimeAsync(2_999)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)

      expect((await pending).value).toEqual([1])
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('treats 503 and 504 as throttling too', async () => {
      vi.useFakeTimers()
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(jsonResponse({}, 503))
        .mockResolvedValueOnce(jsonResponse({}, 504))
        .mockResolvedValueOnce(jsonResponse({ value: [1] }))
      const client = createGraphClient(token, fetchImpl)

      const pending = client.get<{ value: number[] }>('/x')
      await vi.runAllTimersAsync()

      expect((await pending).value).toEqual([1])
      expect(fetchImpl).toHaveBeenCalledTimes(3)
    })

    it('gives up after MAX_THROTTLE_RETRIES and surfaces the 429', async () => {
      vi.useFakeTimers()
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'still busy' } }, 429))
      const client = createGraphClient(token, fetchImpl)

      const pending = client.get('/x').catch((e: unknown) => e)
      await vi.runAllTimersAsync()
      const err = (await pending) as ApiError

      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(429)
      expect(err.message).toBe('still busy')
      expect(fetchImpl).toHaveBeenCalledTimes(1 + MAX_THROTTLE_RETRIES)
    })

    it('does not retry a non-throttling failure', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, 500))
      const client = createGraphClient(token, fetchImpl)
      await expect(client.get('/x')).rejects.toBeInstanceOf(ApiError)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('re-sends only the throttled sub-requests of a $batch, after their Retry-After', async () => {
      vi.useFakeTimers()
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(
          jsonResponse({
            responses: [
              { id: '0', status: 200, body: { url: '/sites/a' } },
              { id: '1', status: 429, headers: { 'retry-after': '5' }, body: { error: {} } },
              { id: '2', status: 404 },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ responses: [{ id: '1', status: 200, body: { url: '/sites/b' } }] }),
        )
      const client = createGraphClient(token, fetchImpl as unknown as typeof fetch)

      const pending = client.batchGet<{ url: string }>(['/sites/a', '/sites/b', '/sites/gone'])
      await vi.advanceTimersByTimeAsync(4_999)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      const results = await pending

      expect(fetchImpl).toHaveBeenCalledTimes(2)
      expect(batchRequests(fetchImpl.mock.calls[1][1] as RequestInit)).toEqual([
        { id: '1', method: 'GET', url: '/sites/b' },
      ])
      expect(results).toEqual([
        { status: 200, body: { url: '/sites/a' } },
        { status: 200, body: { url: '/sites/b' } },
        { status: 404, body: undefined },
      ])
    })

    it('returns the last 429 for a sub-request that stays throttled', async () => {
      vi.useFakeTimers()
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({ responses: [{ id: '0', status: 429, headers: { 'Retry-After': '1' } }] }),
      )
      const client = createGraphClient(token, fetchImpl)

      const pending = client.batchGet(['/sites/a'])
      await vi.runAllTimersAsync()

      expect(await pending).toEqual([{ status: 429, body: undefined }])
      expect(fetchImpl).toHaveBeenCalledTimes(1 + MAX_THROTTLE_RETRIES)
    })
  })

  describe('retryAfterMs', () => {
    const now = Date.parse('2026-09-17T10:00:00Z')

    it.each([
      ['a delay in seconds', '3', 3_000],
      ['an HTTP date', 'Wed, 17 Sep 2026 10:00:10 GMT', 10_000],
      ['a missing header', null, DEFAULT_RETRY_AFTER_MS],
      ['an unparseable header', 'soon', DEFAULT_RETRY_AFTER_MS],
      ['a date in the past', 'Wed, 17 Sep 2026 09:59:00 GMT', DEFAULT_RETRY_AFTER_MS],
      ['a delay beyond the cap', '600', MAX_RETRY_AFTER_MS],
    ])('handles %s', (_case, header, expected) => {
      expect(retryAfterMs(header, now)).toBe(expected)
    })
  })
})
