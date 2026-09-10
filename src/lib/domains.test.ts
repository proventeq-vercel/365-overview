import { describe, expect, it } from 'vitest'
import { domainFromAddress, domainFromExternalUpn, guestDomain, isExternalDomain } from './domains'

const VERIFIED = ['contoso.com', 'contoso.onmicrosoft.com']

describe('domainFromAddress', () => {
  it('lower-cases the domain part', () => {
    expect(domainFromAddress('Ada@Fabrikam.CO.UK')).toBe('fabrikam.co.uk')
  })

  it('rejects anything that is not an address', () => {
    expect(domainFromAddress('')).toBeNull()
    expect(domainFromAddress(null)).toBeNull()
    expect(domainFromAddress('no-at-sign')).toBeNull()
    expect(domainFromAddress('trailing@')).toBeNull()
    expect(domainFromAddress('@leading.com')).toBeNull()
  })

  it('rejects a hashed name left by concealed reporting', () => {
    expect(domainFromAddress('B4B2A1F0C9')).toBeNull()
  })

  it('rejects a dotless host', () => {
    expect(domainFromAddress('ada@localhost')).toBeNull()
  })
})

describe('domainFromExternalUpn', () => {
  it('recovers the invited address domain from a B2B UPN', () => {
    expect(domainFromExternalUpn('ada_fabrikam.com#EXT#@contoso.onmicrosoft.com')).toBe('fabrikam.com')
  })

  it('handles a local part that itself contains underscores', () => {
    expect(domainFromExternalUpn('ada_lovelace_fabrikam.com#EXT#@contoso.onmicrosoft.com')).toBe('fabrikam.com')
  })

  it('is case-insensitive about the marker', () => {
    expect(domainFromExternalUpn('ada_fabrikam.com#ext#@contoso.onmicrosoft.com')).toBe('fabrikam.com')
  })

  it('returns null for a member UPN with no marker', () => {
    expect(domainFromExternalUpn('ada@contoso.com')).toBeNull()
    expect(domainFromExternalUpn(null)).toBeNull()
  })
})

describe('guestDomain', () => {
  it('prefers the guest mail address', () => {
    expect(
      guestDomain({ mail: 'ada@fabrikam.com', userPrincipalName: 'ada_other.com#EXT#@contoso.onmicrosoft.com' }),
    ).toBe('fabrikam.com')
  })

  it('falls back to the UPN when mail is missing', () => {
    expect(guestDomain({ mail: null, userPrincipalName: 'ada_fabrikam.com#EXT#@contoso.onmicrosoft.com' })).toBe(
      'fabrikam.com',
    )
  })

  it('never reads the tenant domain off an #EXT# UPN', () => {
    expect(guestDomain({ userPrincipalName: 'ada#EXT#@contoso.onmicrosoft.com' })).toBeNull()
  })

  it('is null when the guest cannot be attributed to a domain', () => {
    expect(guestDomain({})).toBeNull()
  })
})

describe('isExternalDomain', () => {
  it('treats a verified domain as internal', () => {
    expect(isExternalDomain('contoso.com', VERIFIED)).toBe(false)
    expect(isExternalDomain('CONTOSO.COM', VERIFIED)).toBe(false)
  })

  it('treats anything else as external', () => {
    expect(isExternalDomain('fabrikam.com', VERIFIED)).toBe(true)
  })

  it('treats every domain as external when verified domains are unknown', () => {
    expect(isExternalDomain('contoso.com', [])).toBe(true)
  })
})
