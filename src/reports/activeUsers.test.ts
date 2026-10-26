import { describe, expect, it } from 'vitest'
import { parseOneDriveLicences } from './activeUsers'

describe('parseOneDriveLicences', () => {
  it('keys each user by lower-cased principal name, with whether a OneDrive licence is assigned', () => {
    const licences = parseOneDriveLicences([
      { userPrincipalName: 'Ada@Contoso.com', hasOneDriveLicense: true },
      { userPrincipalName: 'leaver@contoso.com', hasOneDriveLicense: 'False' },
      { hasOneDriveLicense: true },
    ])
    expect([...licences]).toEqual([
      ['ada@contoso.com', true],
      ['leaver@contoso.com', false],
    ])
  })
})
