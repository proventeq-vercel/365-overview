import { describe, expect, it } from 'vitest'
import { ApiError, isConsentRequired, isForbidden, PROXY_CONSENT_CODE } from './apiError'

describe('isForbidden', () => {
  it('is true only for a Graph 403', () => {
    expect(isForbidden(new ApiError(403, 'no'))).toBe(true)
    expect(isForbidden(new ApiError(401, 'no'))).toBe(false)
    expect(isForbidden(new ApiError(500, 'no'))).toBe(false)
    expect(isForbidden(new Error('403'))).toBe(false)
  })
})

describe('isConsentRequired', () => {
  it('recognises the MSAL interaction-required error by name', () => {
    const err = Object.assign(new Error('needs interaction'), { name: 'InteractionRequiredAuthError' })
    expect(isConsentRequired(err)).toBe(true)
  })

  it('recognises the org-not-consented code wherever it appears', () => {
    expect(isConsentRequired(new Error('AADSTS65001: The user or administrator has not consented'))).toBe(true)
    expect(isConsentRequired(Object.assign(new Error('x'), { errorCode: 'consent_required' }))).toBe(true)
  })

  it('recognises the proxy telling it the tenant admin has not consented to the application', () => {
    expect(isConsentRequired(new ApiError(403, 'An administrator has not consented yet.', PROXY_CONSENT_CODE))).toBe(true)
    expect(isConsentRequired(new ApiError(403, 'An administrator has not consented yet.', 'DirectoryRoleRequired'))).toBe(false)
  })

  it('does not mistake a missing role for missing consent', () => {
    expect(isConsentRequired(new ApiError(403, 'Access denied'))).toBe(false)
    expect(isConsentRequired(null)).toBe(false)
    expect(isConsentRequired('AADSTS65001')).toBe(false)
  })
})
