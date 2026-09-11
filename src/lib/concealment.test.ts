import { describe, it, expect } from 'vitest'
import { namesAreConcealed } from './concealment'

const clear = Array.from({ length: 10 }, (_, i) => ({
  url: `https://contoso.sharepoint.com/sites/team-${i}`,
  ownerDisplayName: `Person ${i}`,
}))

const concealed = Array.from({ length: 10 }, () => ({
  url: '',
  ownerDisplayName: '2C4A3F1E9B7D5A6C8E0F1A2B3C4D5E6F',
}))

describe('namesAreConcealed', () => {
  it('is false for a tenant reporting real names', () => {
    expect(namesAreConcealed(clear)).toBe(false)
  })

  it('is true when most rows carry hashed identities', () => {
    expect(namesAreConcealed(concealed)).toBe(true)
  })

  it('is true for a mostly-concealed tenant with a few clear rows', () => {
    expect(namesAreConcealed([...concealed, ...clear.slice(0, 2)])).toBe(true)
  })

  it('does not read blank URLs as concealment: Graph omits siteUrl on tenants with readable names', () => {
    const blankUrls = Array.from({ length: 10 }, (_, i) => ({
      url: '',
      ownerDisplayName: `CPSDemo Owners ${i}`,
    }))
    expect(namesAreConcealed(blankUrls)).toBe(false)
  })

  it('detects concealment from hashed owner names alone, with readable URLs', () => {
    const hashedNames = Array.from({ length: 10 }, (_, i) => ({
      url: `https://contoso.sharepoint.com/sites/team-${i}`,
      ownerDisplayName: '2C4A3F1E9B7D5A6C8E0F1A2B3C4D5E6F',
    }))
    expect(namesAreConcealed(hashedNames)).toBe(true)
  })

  it('is false when a minority of rows are concealed', () => {
    expect(namesAreConcealed([...clear, ...concealed.slice(0, 3)])).toBe(false)
  })

  it('does not read a short hex-looking name as a hash', () => {
    const rows = Array.from({ length: 10 }, () => ({
      url: 'https://contoso.sharepoint.com/sites/ace',
      ownerDisplayName: 'Ada',
    }))
    expect(namesAreConcealed(rows)).toBe(false)
  })

  it('is false for no rows, because absence of data is not evidence of concealment', () => {
    expect(namesAreConcealed([])).toBe(false)
  })
})
