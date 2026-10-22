import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createGraphClient,
  retryAfterMs,
  DEFAULT_RETRY_AFTER_MS,
  MAX_RETRY_AFTER_MS,
  MAX_THROTTLE_RETRIES,
} from './graphClient'
import { ApiError, isConsentRequired, isForbidden, isTenantNotAllowed } from './apiError'

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
  it('reports a request that never reached Graph as an ApiError, so callers can tell it from a bug', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const err = (await createGraphClient(token, fetchImpl).get('/x').catch((e) => e)) as ApiError
    expect([err instanceof ApiError, err.status, err.code, err.message]).toEqual([true, 0, 'NetworkError', 'Failed to fetch'])
  })
  it('reports a body that stopped arriving as a network failure, and a malformed one as the bug it is', async () => {
    const answer = (reason: Error) => ({ ...jsonResponse({}), json: () => Promise.reject(reason) }) as Response
    const dropped = vi.fn().mockResolvedValue(answer(new TypeError('network error')))
    const garbled = vi.fn().mockResolvedValue(answer(new SyntaxError('Unexpected end of JSON input')))
    const lost = (await createGraphClient(token, dropped).get('/x').catch((e) => e)) as ApiError
    const broken = await createGraphClient(token, garbled).get('/x').catch((e) => e)
    expect([lost instanceof ApiError, lost.status, lost.code]).toEqual([true, 0, 'NetworkError'])
    expect([broken instanceof ApiError, broken instanceof SyntaxError]).toEqual([false, true])
  })
  it('keeps the error code a Graph-shaped body carries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'AdminConsentRequired', message: 'consent first' } }, 403),
    )
    const err = (await createGraphClient(token, fetchImpl).get('/x').catch((e) => e)) as ApiError
    expect(err.code).toBe('AdminConsentRequired')
    expect(err.message).toBe('consent first')
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

  describe('followed links', () => {
    const PROXY = 'http://127.0.0.1:7071/api/graph'
    const withNextLink = (link: string) => jsonResponse({ value: [1], '@odata.nextLink': link })
    const refusedAddresses: [string, string][] = [
      ['another host', 'https://evil.example/v1.0/x?p=2'],
      ['a host that only starts with the name of Graph', 'https://graph.microsoft.com.evil.example/v1.0/x?p=2'],
      ['a host that follows Graph as userinfo', 'https://graph.microsoft.com@evil.example/v1.0/x?p=2'],
      ['Graph over plain http', 'http://graph.microsoft.com/v1.0/x?p=2'],
      ['Graph on another port', 'https://graph.microsoft.com:8443/v1.0/x?p=2'],
      ['Graph with a user name before the host', 'https://user@graph.microsoft.com/v1.0/x?p=2'],
      ['Graph with a user name and password before the host', 'https://user:secret@graph.microsoft.com/v1.0/x?p=2'],
    ]
    const notAnAddress: [string, string][] = [
      ['a protocol-relative address', '//evil.example/v1.0/x?p=2'],
      ['a path with no host', '/v1.0/x?p=2'],
      ['text that is not an address', 'not a url'],
    ]
    const sameOriginSpellings: [string, string][] = [
      ['the default port spelled out', 'https://graph.microsoft.com:443/v1.0/x?p=2'],
      ['a scheme and host in capitals', 'HTTPS://GRAPH.MICROSOFT.COM/v1.0/x?p=2'],
    ]

    it.each([...refusedAddresses, ...notAnAddress])(
      'refuses a nextLink to %s before reading a token or sending anything to it',
      async (_case, link) => {
        const getToken = vi.fn(token)
        const fetchImpl = vi.fn().mockResolvedValueOnce(withNextLink(link))
        const client = createGraphClient(getToken, fetchImpl)

        const err = (await client.getAllPages<number>('/x').catch((e: unknown) => e)) as ApiError

        expect(err).toBeInstanceOf(ApiError)
        expect(err.status).toBe(502)
        expect(err.code).toBe('LinkNotAllowed')
        expect(err.message).not.toContain(link)
        expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(['https://graph.microsoft.com/v1.0/x'])
        expect(getToken).toHaveBeenCalledTimes(1)
      },
    )

    it.each(refusedAddresses)('refuses to get an address on %s', async (_case, address) => {
      const getToken = vi.fn(token)
      const fetchImpl = vi.fn()
      const client = createGraphClient(getToken, fetchImpl)

      await expect(client.get(address)).rejects.toMatchObject({ status: 502, code: 'LinkNotAllowed' })

      expect(getToken).not.toHaveBeenCalled()
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it.each(sameOriginSpellings)('follows a nextLink with %s as sent', async (_case, link) => {
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(withNextLink(link))
        .mockResolvedValueOnce(jsonResponse({ value: [2] }))
      const client = createGraphClient(token, fetchImpl)

      expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
      expect(fetchImpl.mock.calls[1][0]).toBe(link)
    })

    it.each(sameOriginSpellings)('gets an address with %s as sent', async (_case, address) => {
      const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ value: [1] }))
      const client = createGraphClient(token, fetchImpl)

      await client.get(address)

      expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([address])
    })

    it('compares origins, not spellings, when the configured address is written differently', async () => {
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(withNextLink('https://graph.microsoft.com/v1.0/x?p=2'))
        .mockResolvedValueOnce(jsonResponse({ value: [2] }))
      const client = createGraphClient(token, fetchImpl, 'HTTPS://Graph.Microsoft.com:443')

      expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
      expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
        'HTTPS://Graph.Microsoft.com:443/v1.0/x',
        'https://graph.microsoft.com/v1.0/x?p=2',
      ])
    })

    it.each([
      ['an address with no host', '/api/graph'],
      ['not an http address', 'data:text/plain,x'],
    ])('refuses every call when the configured address is %s', async (_case, configured) => {
      const getToken = vi.fn(token)
      const fetchImpl = vi.fn()
      const client = createGraphClient(getToken, fetchImpl, configured)

      await expect(client.get('/x')).rejects.toMatchObject({ status: 502, code: 'LinkNotAllowed' })

      expect(getToken).not.toHaveBeenCalled()
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('follows a nextLink the proxy put on its own address', async () => {
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(withNextLink(`${PROXY}/v1.0/x?p=2`))
        .mockResolvedValueOnce(jsonResponse({ value: [2] }))
      const client = createGraphClient(token, fetchImpl, PROXY)

      expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
      expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([`${PROXY}/v1.0/x`, `${PROXY}/v1.0/x?p=2`])
    })

    it('refuses a nextLink to Graph itself once calls go through a proxy', async () => {
      const fetchImpl = vi.fn().mockResolvedValueOnce(withNextLink('https://graph.microsoft.com/v1.0/x?p=2'))
      const client = createGraphClient(token, fetchImpl, PROXY)

      await expect(client.getAllPages('/x')).rejects.toMatchObject({ status: 502, code: 'LinkNotAllowed' })

      expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([`${PROXY}/v1.0/x`])
    })

    it('is not read as a consent, tenant or permission refusal', async () => {
      const fetchImpl = vi.fn().mockResolvedValueOnce(withNextLink('https://evil.example/v1.0/x?p=2'))
      const client = createGraphClient(token, fetchImpl)

      const err = (await client.getAllPages('/x').catch((e: unknown) => e)) as ApiError

      expect(isConsentRequired(err)).toBe(false)
      expect(isTenantNotAllowed(err)).toBe(false)
      expect(isForbidden(err)).toBe(false)
      expect(err.isAuth).toBe(false)
    })
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
