import { describe, expect, it } from 'vitest'
import { ApiError, isConsentRequired, isForbidden, PROXY_CONSENT_CODE, PROXY_ROLE_CODE } from './apiError'

describe('isForbidden', () => {
  it('is true only for a Graph 403', () => {
    expect(isForbidden(new ApiError(403, 'no'))).toBe(true)
    expect(isForbidden(new ApiError(401, 'no'))).toBe(false)
    expect(isForbidden(new ApiError(500, 'no'))).toBe(false)
    expect(isForbidden(new Error('403'))).toBe(false)
  })

  it('does not ask for a role when an app-only call through the proxy is refused, since no role reaches it', () => {
    expect(isForbidden(new ApiError(403, 'Either scp or roles claim need to be present', 'UnknownError', true))).toBe(false)
  })

  it("still reads the proxy's own role check as a role failure", () => {
    expect(isForbidden(new ApiError(403, 'A directory role is required.', PROXY_ROLE_CODE, true))).toBe(true)
  })
})

describe('isConsentRequired', () => {
  it('does not call an MFA or Conditional Access prompt missing consent', () => {
    const mfa = Object.assign(new Error('AADSTS50076: you must use multi-factor authentication'), {
      name: 'InteractionRequiredAuthError',
      errorCode: 'interaction_required',
    })
    expect(isConsentRequired(mfa)).toBe(false)
  })

  it('recognises the org-not-consented code wherever it appears', () => {
    expect(isConsentRequired(new Error('AADSTS65001: The user or administrator has not consented'))).toBe(true)
    expect(isConsentRequired(Object.assign(new Error('x'), { errorCode: 'consent_required' }))).toBe(true)
  })

  it('recognises the proxy telling it the tenant admin has not consented to the application', () => {
    expect(isConsentRequired(new ApiError(403, 'An administrator has not consented yet.', PROXY_CONSENT_CODE))).toBe(true)
  })

  it('treats an ungranted application permission on an app-only call as a consent failure, not a user role failure', () => {
    const error = new ApiError(403, 'Insufficient privileges.', 'Authorization_RequestDenied', true)
    expect(isConsentRequired(error)).toBe(true)
    expect(isConsentRequired(new ApiError(403, 'An administrator has not consented yet.', 'DirectoryRoleRequired'))).toBe(false)
  })

  it("reads the same refusal on the user's own delegated call as a permission gap, since consent is already given", () => {
    expect(isConsentRequired(new ApiError(403, 'Insufficient privileges.', 'Authorization_RequestDenied', false))).toBe(false)
  })

  it('does not mistake a missing role for missing consent', () => {
    expect(isConsentRequired(new ApiError(403, 'Access denied'))).toBe(false)
    expect(isConsentRequired(null)).toBe(false)
    expect(isConsentRequired('AADSTS65001')).toBe(false)
  })
})
