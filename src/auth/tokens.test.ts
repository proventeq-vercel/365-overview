import { describe, it, expect, vi } from 'vitest'
import {
  BrowserAuthError,
  InteractionRequiredAuthError,
} from '@azure/msal-browser'
import { ApiError, isConsentRequired } from '../clients/apiError'
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

  it('uses the cached token when it carries the required scope', async () => {
    const acquireTokenSilent = vi
      .fn()
      .mockResolvedValue({ accessToken: 'granted', scopes: ['User.Read', 'Reports.Read.All'] })
    const instance = { acquireTokenSilent, acquireTokenRedirect: vi.fn() } as never
    expect(await acquireToken(instance, account, ['s'], 'Reports.Read.All')).toBe('granted')
    expect(acquireTokenSilent).toHaveBeenCalledTimes(1)
  })

  it('refreshes once when the cached token predates the grant, and uses the fresh token', async () => {
    const acquireTokenSilent = vi
      .fn()
      .mockResolvedValueOnce({ accessToken: 'stale', scopes: ['openid', 'profile', 'email'] })
      .mockResolvedValueOnce({ accessToken: 'fresh', scopes: ['https://graph.microsoft.com/Reports.Read.All'] })
    const instance = { acquireTokenSilent, acquireTokenRedirect: vi.fn() } as never
    expect(await acquireToken(instance, account, ['s'], 'Reports.Read.All')).toBe('fresh')
    expect(acquireTokenSilent.mock.calls[1][0]).toEqual({ account, scopes: ['s'], forceRefresh: true })
  })

  it('reports a missing admin consent, not a role problem, when the scope was never granted', async () => {
    const acquireTokenRedirect = vi.fn()
    const instance = {
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'bare', scopes: ['openid', 'profile', 'email'] }),
      acquireTokenRedirect,
    } as never
    const error = await acquireToken(instance, account, ['s'], 'Reports.Read.All').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(isConsentRequired(error)).toBe(true)
    expect(acquireTokenRedirect).not.toHaveBeenCalled()
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
