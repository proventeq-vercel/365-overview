import { describe, it, expect } from 'vitest'
import type { UsagePoint } from '@/types/reports'
import {
  CRITICAL_MONTHS,
  HORIZON_MONTHS,
  WARNING_MONTHS,
  buildGrowthPoints,
  exhaustionDateFor,
  forecastStatusFor,
  growthRateBytesPerMonth,
  isSeriesVolatile,
  monthlyBuckets,
  monthsToExhaustion,
} from './forecast'

const daily = (entries: [string, number][]): UsagePoint[] =>
  entries.map(([date, value]) => ({ date, value }))

describe('monthlyBuckets', () => {
  it('takes the last reading in each calendar month, oldest first', () => {
    const points = daily([
      ['2026-01-05', 100],
      ['2026-01-28', 150],
      ['2026-02-14', 200],
      ['2026-02-27', 260],
    ])
    expect(monthlyBuckets(points)).toEqual([
      { month: '2026-01', bytes: 150 },
      { month: '2026-02', bytes: 260 },
    ])
  })

  it('takes the last reading even when the series arrives out of order', () => {
    const points = daily([
      ['2026-02-27', 260],
      ['2026-01-28', 150],
      ['2026-02-14', 200],
      ['2026-01-05', 100],
    ])
    expect(monthlyBuckets(points)).toEqual([
      { month: '2026-01', bytes: 150 },
      { month: '2026-02', bytes: 260 },
    ])
  })

  it('is empty for no readings', () => {
    expect(monthlyBuckets([])).toEqual([])
  })
})

describe('growthRateBytesPerMonth', () => {
  it('is the median of month-over-month deltas', () => {
    const buckets = [
      { month: '2026-01', bytes: 100 },
      { month: '2026-02', bytes: 110 },
      { month: '2026-03', bytes: 130 },
      { month: '2026-04', bytes: 145 },
    ]
    expect(growthRateBytesPerMonth(buckets)).toBe(15)
  })

  it('ignores one anomalous month rather than averaging it in', () => {
    const buckets = [
      { month: '2026-01', bytes: 100 },
      { month: '2026-02', bytes: 110 },
      { month: '2026-03', bytes: 120 },
      { month: '2026-04', bytes: 900 },
    ]
    expect(growthRateBytesPerMonth(buckets)).toBe(10)
  })

  it('is zero with fewer than two buckets, because no delta exists', () => {
    expect(growthRateBytesPerMonth([{ month: '2026-01', bytes: 100 }])).toBe(0)
    expect(growthRateBytesPerMonth([])).toBe(0)
  })

  it('can be negative for a shrinking tenant', () => {
    const buckets = [
      { month: '2026-01', bytes: 200 },
      { month: '2026-02', bytes: 180 },
      { month: '2026-03', bytes: 160 },
    ]
    expect(growthRateBytesPerMonth(buckets)).toBe(-20)
  })
})

describe('isSeriesVolatile', () => {
  it('is false for steady growth', () => {
    const buckets = [
      { month: '2026-01', bytes: 100 },
      { month: '2026-02', bytes: 110 },
      { month: '2026-03', bytes: 120 },
      { month: '2026-04', bytes: 130 },
    ]
    expect(isSeriesVolatile(buckets)).toBe(false)
  })

  it('is true when one step dominates and skews the endpoint rate', () => {
    const buckets = [
      { month: '2026-01', bytes: 100 },
      { month: '2026-02', bytes: 105 },
      { month: '2026-03', bytes: 110 },
      { month: '2026-04', bytes: 900 },
    ]
    expect(isSeriesVolatile(buckets)).toBe(true)
  })

  it('is true when a flat median hides real end-to-end movement', () => {
    const buckets = [
      { month: '2026-01', bytes: 100 },
      { month: '2026-02', bytes: 100 },
      { month: '2026-03', bytes: 100 },
      { month: '2026-04', bytes: 400 },
    ]
    expect(isSeriesVolatile(buckets)).toBe(true)
  })

  it('is false when there is nothing to compare', () => {
    expect(isSeriesVolatile([{ month: '2026-01', bytes: 100 }])).toBe(false)
  })
})

describe('monthsToExhaustion', () => {
  it('divides headroom by the growth rate', () => {
    expect(monthsToExhaustion(100, 400, 30)).toBe(10)
  })

  it('is null when the entitlement is unknown', () => {
    expect(monthsToExhaustion(100, null, 30)).toBeNull()
  })

  it('is zero when the tenant is already over its entitlement', () => {
    expect(monthsToExhaustion(500, 400, 30)).toBe(0)
  })

  it('is null for a flat tenant, because there is no rate to divide by', () => {
    expect(monthsToExhaustion(100, 400, 0)).toBeNull()
  })

  it('is null for a shrinking tenant, which never exhausts', () => {
    expect(monthsToExhaustion(100, 400, -30)).toBeNull()
  })
})

describe('forecastStatusFor', () => {
  it('is Unknown without an entitlement', () => {
    expect(forecastStatusFor(5, false, false)).toBe('Unknown')
  })

  it('is Unknown when history is too short, even with a runway figure', () => {
    expect(forecastStatusFor(5, true, true)).toBe('Unknown')
  })

  it('is Critical inside a year', () => {
    expect(forecastStatusFor(0, false, true)).toBe('Critical')
    expect(forecastStatusFor(CRITICAL_MONTHS - 1, false, true)).toBe('Critical')
  })

  it('is Warning between one and three years', () => {
    expect(forecastStatusFor(CRITICAL_MONTHS, false, true)).toBe('Warning')
    expect(forecastStatusFor(WARNING_MONTHS - 1, false, true)).toBe('Warning')
  })

  it('is Healthy beyond three years, and for a null runway with a known entitlement', () => {
    expect(forecastStatusFor(WARNING_MONTHS, false, true)).toBe('Healthy')
    expect(forecastStatusFor(null, false, true)).toBe('Healthy')
  })

  it('grades on the thresholds ported from P365', () => {
    expect(CRITICAL_MONTHS).toBe(12)
    expect(WARNING_MONTHS).toBe(36)
    expect(HORIZON_MONTHS).toBe(120)
  })
})

describe('exhaustionDateFor', () => {
  const from = new Date('2026-01-15T00:00:00Z')

  it('is a calendar date the given number of months ahead', () => {
    expect(exhaustionDateFor(6, from)).toBe('2026-07-15')
  })

  it('is null beyond the ten-year horizon, which is no-exhaustion rather than a date', () => {
    expect(exhaustionDateFor(HORIZON_MONTHS + 1, from)).toBeNull()
  })

  it('is null when the runway is unknown', () => {
    expect(exhaustionDateFor(null, from)).toBeNull()
  })

  it('leaves the caller Date untouched', () => {
    const start = new Date('2026-01-15T00:00:00Z')
    exhaustionDateFor(6, start)
    expect(start.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })
})

describe('buildGrowthPoints', () => {
  const buckets = [
    { month: '2026-01', bytes: 100 },
    { month: '2026-02', bytes: 200 },
  ]

  it('carries history as actuals and projects forward at the rate', () => {
    expect(buildGrowthPoints(buckets, 100, 2)).toEqual([
      { month: '2026-01', actualUsedBytes: 100, projectedUsedBytes: null },
      { month: '2026-02', actualUsedBytes: 200, projectedUsedBytes: 200 },
      { month: '2026-03', actualUsedBytes: null, projectedUsedBytes: 300 },
      { month: '2026-04', actualUsedBytes: null, projectedUsedBytes: 400 },
    ])
  })

  it('rolls the projected months across a year boundary', () => {
    const points = buildGrowthPoints([{ month: '2026-11', bytes: 10 }], 1, 3)
    expect(points.map((p) => p.month)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ])
  })

  it('joins the lines by giving the last actual a projected value too', () => {
    const points = buildGrowthPoints(buckets, 100, 1)
    expect(points[1].actualUsedBytes).toBe(200)
    expect(points[1].projectedUsedBytes).toBe(200)
  })

  it('never projects below zero for a shrinking tenant', () => {
    const points = buildGrowthPoints([{ month: '2026-01', bytes: 50 }], -100, 2)
    expect(points.map((p) => p.projectedUsedBytes)).toEqual([50, 0, 0])
  })

  it('returns an empty array with no history', () => {
    expect(buildGrowthPoints([], 100, 6)).toEqual([])
  })
})
