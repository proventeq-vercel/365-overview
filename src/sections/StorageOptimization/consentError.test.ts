import { describe, it, expect } from 'vitest'
import { ApiError } from '@/clients/apiError'
import { consentErrorFor } from './consentError'

describe('consentErrorFor', () => {
  it('recognises a missing-consent failure', () => {
    expect(
      consentErrorFor(
        new ApiError(403, 'AADSTS65001: The user or administrator has not consented'),
      ),
    ).toBe('consent')
  })

  it('recognises the consent failure whatever status carries it', () => {
    expect(consentErrorFor(new ApiError(400, 'AADSTS65001: consent required'))).toBe(
      'consent',
    )
  })

  it('recognises the MSAL consent failure that never becomes an ApiError', () => {
    expect(
      consentErrorFor(
        Object.assign(new Error('AADSTS65001: not consented'), {
          name: 'InteractionRequiredAuthError',
        }),
      ),
    ).toBe('consent')
  })

  it('recognises a role failure as distinct from consent', () => {
    expect(consentErrorFor(new ApiError(403, 'Forbidden'))).toBe('permission')
  })

  it('treats a 401 as a role failure rather than a generic one', () => {
    expect(consentErrorFor(new ApiError(401, 'Unauthorized'))).toBe('permission')
  })

  it('treats anything else as a generic failure', () => {
    expect(consentErrorFor(new ApiError(500, 'Server error'))).toBe('other')
    expect(consentErrorFor(new Error('offline'))).toBe('other')
    expect(consentErrorFor(undefined)).toBe('other')
  })
})
