import { describe, it, expect, vi } from 'vitest'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { acquireToken } from './tokens'

const account = { homeAccountId: 'a' } as never

describe('acquireToken', () => {
  it('returns silent token when available', async () => {
    const instance = { acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'silent' }) } as never
    expect(await acquireToken(instance, account, ['s'])).toBe('silent')
  })
  it('falls back to popup on InteractionRequired', async () => {
    const instance = {
      acquireTokenSilent: vi.fn().mockRejectedValue(new InteractionRequiredAuthError('interaction_required', 'interaction required')),
      acquireTokenPopup: vi.fn().mockResolvedValue({ accessToken: 'popup' }),
    } as never
    expect(await acquireToken(instance, account, ['s'])).toBe('popup')
  })
  it('rethrows other errors', async () => {
    const instance = { acquireTokenSilent: vi.fn().mockRejectedValue(new Error('boom')) } as never
    await expect(acquireToken(instance, account, ['s'])).rejects.toThrow('boom')
  })
})
