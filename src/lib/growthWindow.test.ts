import { describe, expect, it } from 'vitest'
import { daysBetween, growthBaselineDate, growthWindowDates } from './growthWindow'

describe('growthBaselineDate', () => {
  it('starts at the oldest day Graph accepts, 27 days before today', () => {
    expect(growthBaselineDate('2026-10-24', new Date('2026-10-26T16:00:00Z'))).toBe('2026-09-29')
  })

  it('stops at the oldest day Microsoft keeps when four weeks back is out of range', () => {
    expect(growthBaselineDate('2026-10-16', new Date('2026-10-19T09:00:00Z'))).toBe('2026-09-22')
  })

  it('keeps four weeks before an old report date rather than reaching past it', () => {
    expect(growthBaselineDate('2026-08-30', new Date('2026-10-19T09:00:00Z'))).toBe('2026-08-02')
  })

  it('counts back from today when the report carries no refresh date', () => {
    expect(growthBaselineDate('', new Date('2026-10-19T09:00:00Z'))).toBe('2026-09-22')
  })
})

describe('growthWindowDates', () => {
  it('lists every day from the oldest Graph accepts to the report date', () => {
    const dates = growthWindowDates('2026-10-24', new Date('2026-10-26T16:00:00Z'))
    expect(dates).toHaveLength(26)
    expect(dates.slice(0, 2)).toEqual(['2026-09-29', '2026-09-30'])
    expect(dates.at(-1)).toBe('2026-10-24')
  })

  it('ends today when the report carries no refresh date', () => {
    const dates = growthWindowDates('', new Date('2026-10-19T09:00:00Z'))
    expect([dates[0], dates.at(-1), dates.length]).toEqual(['2026-09-22', '2026-10-19', 28])
  })
})

describe('daysBetween', () => {
  it('counts whole days between two report dates', () => {
    expect(daysBetween('2026-09-20', '2026-10-16')).toBe(26)
  })
})
