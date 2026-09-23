import { describe, it, expect } from 'vitest'
import {
  formatBytes,
  formatDay,
  formatLongMonthYear,
  formatShortMonthYear,
  formatNumber,
  formatPercent,
  formatSignedBytes,
  formatSignedPercent,
} from './format'

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

  it('keeps the unit and the sign on a negative figure', () => {
    expect(formatBytes(-1.5 * 1024 * 1024 * 1024)).toBe('-1.5 GB')
  })

  it('handles TB', () => {
    expect(formatBytes(1024 ** 4)).toBe('1 TB')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators the same way on every machine', () => {
    expect(formatNumber(1000000)).toBe('1,000,000')
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

describe('formatSignedBytes', () => {
  it('prefixes growth with a plus and keeps the minus on shrinkage', () => {
    expect(formatSignedBytes(2 * 1024 * 1024)).toBe('+2 MB')
    expect(formatSignedBytes(-2 * 1024 * 1024)).toBe('-2 MB')
    expect(formatSignedBytes(0)).toBe('0 B')
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

describe('formatShortMonthYear', () => {
  it('renders a YYYY-MM bucket as its abbreviated month and year', () => {
    expect(formatShortMonthYear('2026-03')).toBe('Mar 2026')
    expect(formatShortMonthYear('2027-12')).toBe('Dec 2027')
  })

  it('returns an unparseable label untouched', () => {
    expect(formatShortMonthYear('n/a')).toBe('n/a')
  })
})

describe('formatDay', () => {
  it('writes a report date the way the rest of the page writes dates', () => {
    expect(formatDay('2026-08-30')).toBe('30 Aug 2026')
  })

  it('keeps the calendar day of a timestamp late in the UTC day', () => {
    expect(formatDay('2026-08-30T23:30:00Z')).toBe('30 Aug 2026')
  })

  it('hands back text that is not a date rather than printing Invalid Date', () => {
    expect(formatDay('soon')).toBe('soon')
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
