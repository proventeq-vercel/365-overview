import { describe, it, expect } from 'vitest'
import { parseOrg } from './org'

describe('parseOrg', () => {
  it('maps displayName, default verified domain, and country', () => {
    const org = parseOrg({
      displayName: 'Contoso',
      countryLetterCode: 'US',
      verifiedDomains: [
        { name: 'contoso.onmicrosoft.com', isDefault: false },
        { name: 'contoso.com', isDefault: true },
      ],
    })
    expect(org).toEqual({ displayName: 'Contoso', verifiedDomain: 'contoso.com', country: 'US' })
  })

  it('falls back to first domain when none is default', () => {
    const org = parseOrg({
      displayName: 'Fabrikam',
      countryLetterCode: 'GB',
      verifiedDomains: [{ name: 'fabrikam.onmicrosoft.com', isDefault: false }],
    })
    expect(org.verifiedDomain).toBe('fabrikam.onmicrosoft.com')
  })

  it('handles null country', () => {
    const org = parseOrg({
      displayName: 'Test',
      countryLetterCode: null,
      verifiedDomains: [{ name: 'test.com', isDefault: true }],
    })
    expect(org.country).toBeNull()
  })

  it('returns empty string for verifiedDomain when no domains', () => {
    const org = parseOrg({ displayName: 'Empty', countryLetterCode: null, verifiedDomains: [] })
    expect(org.verifiedDomain).toBe('')
  })
})
