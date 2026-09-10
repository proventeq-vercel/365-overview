import { describe, expect, it } from 'vitest'
import { parseOrganization } from './organization'

describe('parseOrganization', () => {
  it('lower-cases verified domains and drops nameless entries', () => {
    expect(
      parseOrganization({
        displayName: 'Contoso Ltd',
        verifiedDomains: [{ name: 'Contoso.com' }, {}, { name: 'contoso.onmicrosoft.com' }],
      }),
    ).toEqual({
      displayName: 'Contoso Ltd',
      verifiedDomains: ['contoso.com', 'contoso.onmicrosoft.com'],
    })
  })

  it('survives an empty /organization collection', () => {
    expect(parseOrganization(undefined)).toEqual({ displayName: '', verifiedDomains: [] })
  })
})
