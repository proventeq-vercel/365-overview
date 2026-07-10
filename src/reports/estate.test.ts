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
  // Live-shape fixtures: Graph returns camelCase `reportDate` plus numeric
  // value columns (often as real numbers) with ?$format=application/json.
  it('maps rows with reportDate to date/value pairs (numeric values)', () => {
    const result = parseUsageCounts(
      [{ reportDate: '2026-06-01', office365: 5 }],
      'office365',
    )
    expect(result).toEqual([{ date: '2026-06-01', value: 5 }])
  })

  it('coerces numeric string values', () => {
    const result = parseUsageCounts(
      [{ reportDate: '2026-06-01', storageUsedInBytes: '1024' }],
      'storageUsedInBytes',
    )
    expect(result).toEqual([{ date: '2026-06-01', value: 1024 }])
  })

  it('filters out rows lacking reportDate', () => {
    const result = parseUsageCounts(
      [
        { reportDate: '2026-06-01', office365: 10 },
        { office365: 99 }, // no reportDate
        { reportDate: '2026-06-02', office365: 20 },
      ],
      'office365',
    )
    expect(result).toHaveLength(2)
    expect(result[1].date).toBe('2026-06-02')
  })

  it('coerces missing valueKey to 0', () => {
    const result = parseUsageCounts([{ reportDate: '2026-06-01' }], 'Missing')
    expect(result[0].value).toBe(0)
  })

  it('handles empty input', () => {
    expect(parseUsageCounts([], 'office365')).toEqual([])
  })
})
