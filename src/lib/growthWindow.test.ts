import { describe, expect, it } from 'vitest'
import { daysBetween, growthWindowDates } from './growthWindow'

describe('growthWindowDates', () => {
  it('lists every day from 26 days before today, a day inside the 28 Graph accepts, to the report date', () => {
    const dates = growthWindowDates('2026-10-24', new Date('2026-10-26T16:00:00Z'))
    expect([dates[0], dates[1], dates.at(-1), dates.length]).toEqual(['2026-09-30', '2026-10-01', '2026-10-24', 25])
  })

  it('never asks for a day older than Graph accepts, the 400 that made growth unavailable', () => {
    const dates = growthWindowDates('2026-10-24', new Date('2026-10-26T23:59:59Z'))
    expect(dates).not.toContain('2026-09-28')
    expect(dates).not.toContain('2026-09-29')
  })

  it('ends today when the report carries no refresh date', () => {
    const dates = growthWindowDates('', new Date('2026-10-19T09:00:00Z'))
    expect([dates[0], dates.at(-1), dates.length]).toEqual(['2026-09-23', '2026-10-19', 27])
  })

  it('never asks for a day after today when the report date is ahead of the clock', () => {
    expect(growthWindowDates('2026-10-28', new Date('2026-10-26T09:00:00Z')).at(-1)).toBe('2026-10-26')
  })

  it('asks for nothing when the report date is older than every day Graph still keeps', () => {
    expect(growthWindowDates('2026-08-30', new Date('2026-10-19T09:00:00Z'))).toEqual([])
    expect(growthWindowDates('2026-09-23', new Date('2026-10-19T09:00:00Z'))).toEqual([])
  })
})

describe('daysBetween', () => {
  it('counts whole days between two report dates', () => {
    expect(daysBetween('2026-09-20', '2026-10-16')).toBe(26)
  })
})
