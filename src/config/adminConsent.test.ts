import { describe, expect, it } from 'vitest'
import { buildAdminConsentUrl } from './adminConsent'

describe('buildAdminConsentUrl', () => {
  it('points at the multi-tenant organizations consent endpoint', () => {
    expect(buildAdminConsentUrl('client-123', 'https://oversharing.example/')).toBe(
      'https://login.microsoftonline.com/organizations/adminconsent?client_id=client-123&redirect_uri=https%3A%2F%2Foversharing.example%2F',
    )
  })
})
