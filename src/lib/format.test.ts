import { describe, it, expect } from 'vitest'
import { formatBytes, formatLongMonthYear, formatNumber, formatPercent, formatSignedPercent } from './format'

describe('formatBytes', () => {
  it('formats units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('trims trailing .0', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('handles TB', () => {
    expect(formatBytes(1024 ** 4)).toBe('1 TB')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    const result = formatNumber(1000000)
    // Accept locale-specific separators (comma or period)
    expect(result).toMatch(/1[,.]000[,.]000/)
  })

  it('handles small numbers', () => {
    expect(formatNumber(42)).toBe('42')
  })
})

describe('formatPercent', () => {
  it('formats a 0–1 ratio as a percent', () => {
    expect(formatPercent(0.856)).toBe('86%')
    expect(formatPercent(0.5, 1)).toBe('50.0%')
  })
})

describe('formatSignedPercent', () => {
  it('prefixes a plus for positive values', () => {
    expect(formatSignedPercent(12.34)).toBe('+12.3%')
  })
  it('keeps the minus for negative values', () => {
    expect(formatSignedPercent(-4.2)).toBe('-4.2%')
  })
})

describe('formatLongMonthYear', () => {
  it('renders an ISO date as its long month and year', () => {
    expect(formatLongMonthYear('2027-08-11')).toBe('August 2027')
  })

  it('does not shift a first-of-month date across a timezone boundary', () => {
    expect(formatLongMonthYear('2027-01-01')).toBe('January 2027')
  })

  it('returns the input untouched when it is not a date', () => {
    expect(formatLongMonthYear('soon')).toBe('soon')
  })
})
