import { describe, expect, it, vi } from 'vitest'
import { createLocalTokenGetter } from './localAuth'

const reply = (token: string, expiresIn = 3600, status = 200) =>
  ({
    ok: status < 400,
    status,
    json: () => Promise.resolve({ access_token: token, expires_in: expiresIn }),
  }) as Response

describe('createLocalTokenGetter', () => {
  it('fetches a user token from the local stack and reuses it until a minute before it expires', async () => {
    let now = 1_000_000
    const fetchImpl = vi.fn().mockResolvedValueOnce(reply('first', 600)).mockResolvedValueOnce(reply('second', 600))
    const getToken = createLocalTokenGetter('http://127.0.0.1:7080', fetchImpl, () => now)

    expect(await getToken()).toBe('first')
    expect(await getToken()).toBe('first')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toBe('http://127.0.0.1:7080/local/user-token')

    now += 539_000
    expect(await getToken()).toBe('first')
    now += 2_000
    expect(await getToken()).toBe('second')
  })

  it('shares one request between the parallel callers the report fires at start-up', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(reply('shared')), 5)),
    )
    const getToken = createLocalTokenGetter('http://127.0.0.1:7080', fetchImpl)
    expect(await Promise.all([getToken(), getToken(), getToken()])).toEqual(['shared', 'shared', 'shared'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('names the stack when it is not running', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply('', 0, 503))
    await expect(createLocalTokenGetter('http://127.0.0.1:7080', fetchImpl)()).rejects.toThrow(
      'http://127.0.0.1:7080 answered 503',
    )
  })
})
