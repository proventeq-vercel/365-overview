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
  it('follows @odata.nextLink in getAllPages', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ value: [1], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/x?p=2' }))
      .mockResolvedValueOnce(jsonResponse({ value: [2] }))
    const client = createGraphClient(token, fetchImpl)
    expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
  })
})
