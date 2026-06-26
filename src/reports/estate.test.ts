import { describe, it, expect } from 'vitest'
import { parseOrg, parseUsageCounts } from './estate'

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

describe('parseUsageCounts', () => {
  it('maps rows with Report Date to date/value pairs', () => {
    const result = parseUsageCounts(
      [{ 'Report Date': '2026-06-01', Total: '5' }],
      'Total',
    )
    expect(result).toEqual([{ date: '2026-06-01', value: 5 }])
  })

  it('filters out rows lacking Report Date', () => {
    const result = parseUsageCounts(
      [
        { 'Report Date': '2026-06-01', Total: '10' },
        { Total: '99' }, // no Report Date
        { 'Report Date': '2026-06-02', Total: '20' },
      ],
      'Total',
    )
    expect(result).toHaveLength(2)
    expect(result[1].date).toBe('2026-06-02')
  })

  it('coerces missing valueKey to 0', () => {
    const result = parseUsageCounts([{ 'Report Date': '2026-06-01' }], 'Missing')
    expect(result[0].value).toBe(0)
  })

  it('handles empty input', () => {
    expect(parseUsageCounts([], 'Total')).toEqual([])
  })
})
