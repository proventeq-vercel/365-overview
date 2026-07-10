import { describe, it, expect, vi } from 'vitest'
import {
  BrowserAuthError,
  InteractionRequiredAuthError,
} from '@azure/msal-browser'
import { acquireToken } from './tokens'

const account = { homeAccountId: 'a' } as never

describe('acquireToken', () => {
  it('returns silent token when available', async () => {
    const instance = {
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'silent' }),
      acquireTokenRedirect: vi.fn(),
    } as never
    expect(await acquireToken(instance, account, ['s'])).toBe('silent')
  })

  it('falls back to acquireTokenRedirect on InteractionRequiredAuthError', async () => {
    const acquireTokenRedirect = vi.fn().mockResolvedValue(undefined)
    const instance = {
      acquireTokenSilent: vi
        .fn()
        .mockRejectedValue(
          new InteractionRequiredAuthError('interaction_required', 'need interaction'),
        ),
      acquireTokenRedirect,
    } as never
    // Redirect navigates the page; the function does not return a token.
    await acquireToken(instance, account, ['s']).catch(() => {})
    expect(acquireTokenRedirect).toHaveBeenCalledWith({ account, scopes: ['s'] })
  })

  it('falls back to acquireTokenRedirect on BrowserAuthError', async () => {
    const acquireTokenRedirect = vi.fn().mockResolvedValue(undefined)
    const instance = {
      acquireTokenSilent: vi
        .fn()
        .mockRejectedValue(
          new BrowserAuthError('redirect_in_iframe', 'redirect in iframe'),
        ),
      acquireTokenRedirect,
    } as never
    await acquireToken(instance, account, ['s']).catch(() => {})
    expect(acquireTokenRedirect).toHaveBeenCalledWith({ account, scopes: ['s'] })
  })

  it('rethrows other errors without redirecting', async () => {
    const acquireTokenRedirect = vi.fn()
    const instance = {
      acquireTokenSilent: vi.fn().mockRejectedValue(new Error('boom')),
      acquireTokenRedirect,
    } as never
    await expect(acquireToken(instance, account, ['s'])).rejects.toThrow('boom')
    expect(acquireTokenRedirect).not.toHaveBeenCalled()
  })
})
