import { describe, expect, it } from 'vitest'
import { daysBetween, growthBaselineDate } from './growthWindow'

describe('growthBaselineDate', () => {
  it('reaches four weeks back from the report date when Microsoft still keeps that day', () => {
    expect(growthBaselineDate('2026-10-17', new Date('2026-10-17T09:00:00Z'))).toBe('2026-09-19')
  })

  it('stops at the oldest day Microsoft keeps when four weeks back is out of range', () => {
    expect(growthBaselineDate('2026-10-16', new Date('2026-10-19T09:00:00Z'))).toBe('2026-09-20')
  })

  it('keeps four weeks before an old report date rather than reaching past it', () => {
    expect(growthBaselineDate('2026-08-30', new Date('2026-10-19T09:00:00Z'))).toBe('2026-08-02')
  })

  it('counts back from today when the report carries no refresh date', () => {
    expect(growthBaselineDate('', new Date('2026-10-19T09:00:00Z'))).toBe('2026-09-21')
  })
})

describe('daysBetween', () => {
  it('counts whole days between two report dates', () => {
    expect(daysBetween('2026-09-20', '2026-10-16')).toBe(26)
  })
})
