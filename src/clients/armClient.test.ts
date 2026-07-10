import { describe, it, expect, vi } from 'vitest'
import { createArmClient } from './armClient'

const token = () => Promise.resolve('tok')
const ok = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response)

describe('armClient', () => {
  it('adds bearer + default api-version on get', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ value: [] }))
    await createArmClient(token, fetchImpl).get('/subscriptions')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://management.azure.com/subscriptions?api-version=2021-04-01')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })
  it('posts json body with given api-version', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ properties: {} }))
    await createArmClient(token, fetchImpl).post('/q', { a: 1 }, '2023-11-01')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('api-version=2023-11-01')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBe('{"a":1}')
  })
  it('follows ARM nextLink in getAllPages', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(
        ok({ value: [1], nextLink: 'https://management.azure.com/subscriptions/x/resources?api-version=2021-04-01&$skiptoken=abc' }),
      )
      .mockResolvedValueOnce(ok({ value: [2] }))
    const result = await createArmClient(token, fetchImpl).getAllPages<number>('/subscriptions/x/resources')
    expect(result).toEqual([1, 2])
    expect(fetchImpl.mock.calls[1][0]).toContain('$skiptoken=abc')
  })
})
