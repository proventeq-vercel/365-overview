import { describe, it, expect } from 'vitest'
import type { GrowthPoint } from '@/types/storage'
import { GB_IN_BYTES } from './entitlement'
import {
  COST_YEARS,
  annualGrowthGb,
  billableGrowthGb,
  costOverTime,
  cumulativeGrowthCost,
  growthCostAnnual,
  growthCostStatus,
  storageCostAnnual,
} from './cost'

describe('annualGrowthGb', () => {
  it('is twelve months of the monthly rate, in binary GB', () => {
    expect(annualGrowthGb(10 * GB_IN_BYTES)).toBe(120)
  })

  it('is zero for a flat tenant', () => {
    expect(annualGrowthGb(0)).toBe(0)
  })

  it('is negative for a shrinking tenant rather than clamped', () => {
    expect(annualGrowthGb(-10 * GB_IN_BYTES)).toBe(-120)
  })
})

describe('billableGrowthGb', () => {
  it('bills nothing while growth stays under the entitlement', () => {
    expect(billableGrowthGb(40, -50)).toBe(0)
  })

  it('bills only the part of the growth above the entitlement', () => {
    expect(billableGrowthGb(60, -50)).toBe(10)
  })

  it('bills all growth once already over, never the overage that exists today', () => {
    expect(billableGrowthGb(60, 30)).toBe(60)
  })

  it('bills all growth when the entitlement is unknown', () => {
    expect(billableGrowthGb(60, null)).toBe(60)
  })

  it('bills nothing for a shrinking tenant', () => {
    expect(billableGrowthGb(-60, -50)).toBe(0)
  })
})

describe('growthCostAnnual', () => {
  it('is zero for growth that fits inside the entitlement', () => {
    expect(growthCostAnnual(120, 0.2, -500)).toBe(0)
  })

  it('prices a year of growth at the monthly rate, as P365 does', () => {
    expect(growthCostAnnual(120, 0.2, null)).toBeCloseTo(288, 2)
  })

  it("prices a year of growth at P365's own default rate", () => {
    expect(growthCostAnnual(120, 0.02, null)).toBeCloseTo(28.8, 2)
  })

  it('is zero for a flat tenant', () => {
    expect(growthCostAnnual(0, 0.2, null)).toBe(0)
  })

  it('prices nothing for a shrinking tenant', () => {
    expect(growthCostAnnual(-120, 0.2, null)).toBe(0)
  })
})

describe('storageCostAnnual', () => {
  it('prices a year of holding the volume at the monthly rate', () => {
    expect(storageCostAnnual(10 * GB_IN_BYTES, 0.2)).toBeCloseTo(24, 2)
  })

  it('is zero for nothing stored', () => {
    expect(storageCostAnnual(0, 0.2)).toBe(0)
  })
})

describe('growthCostStatus', () => {
  it('is healthy when nothing is spent, even if growth overflows at a zero rate', () => {
    expect(growthCostStatus(0, 50, 1000)).toBe('healthy')
  })

  it('needs watching once any money is spent', () => {
    expect(growthCostStatus(12, 1, 1000)).toBe('watch')
  })

  it('stays at watching up to a tenth of the licensed entitlement bought again', () => {
    expect(growthCostStatus(240, 100, 1000)).toBe('watch')
  })

  it('needs attention beyond a tenth of the licensed entitlement', () => {
    expect(growthCostStatus(242.4, 101, 1000)).toBe('attention')
  })

  it('cannot rise past watching without an entitlement to measure against', () => {
    expect(growthCostStatus(99_999, 50_000, null)).toBe('watch')
  })
})

describe('cumulativeGrowthCost', () => {
  it('prices each year on its mid-year average volume, and sums the years', () => {
    expect(cumulativeGrowthCost(100, 1, null)).toBeCloseTo(450 * 12, 2)
  })

  it('is zero for a flat tenant', () => {
    expect(cumulativeGrowthCost(0, 1, null)).toBe(0)
  })

  it('prices nothing for a shrinking tenant', () => {
    expect(cumulativeGrowthCost(-100, 1, null)).toBe(0)
  })

  it('prices mid-year volume, which is strictly less than year-end volume', () => {
    const midYear = cumulativeGrowthCost(100, 1, null, 1)
    const yearEndVolume = 100 * 1 * 12
    expect(midYear).toBeCloseTo(50 * 12, 2)
    expect(midYear).toBeLessThan(yearEndVolume)
  })

  it('accrues over three years by default', () => {
    expect(COST_YEARS).toBe(3)
    expect(cumulativeGrowthCost(100, 1, null)).toBe(cumulativeGrowthCost(100, 1, null, 3))
  })

  it('scales with the rate', () => {
    expect(cumulativeGrowthCost(100, 0.02, null)).toBeCloseTo(450 * 12 * 0.02, 2)
  })
})

describe('costOverTime', () => {
  const GB = GB_IN_BYTES
  const point = (
    month: string,
    actualGb: number | null,
    projectedGb: number,
    afterCleanUpGb: number | null,
  ): GrowthPoint => ({
    month,
    actualUsedBytes: actualGb === null ? null : actualGb * GB,
    projectedUsedBytes: projectedGb * GB,
    afterCleanUpBytes: afterCleanUpGb === null ? null : afterCleanUpGb * GB,
  })
  const points = [
    point('2026-05', 100, 100, 90),
    point('2026-06', null, 110, 100),
    point('2026-07', null, 120, 110),
  ]

  it('prices every line above the entitlement when the forecast passes it', () => {
    const { basis, rows } = costOverTime(points, 105 * GB, 0.5, 10 * GB)
    expect(basis).toBe('billable')
    expect(rows).toEqual([
      { month: '2026-06', forecastCost: 2.5, afterCleanUpCost: 0, afterArchiveCost: 0 },
      { month: '2026-07', forecastCost: 7.5, afterCleanUpCost: 2.5, afterArchiveCost: 0 },
    ])
  })

  it('never prices what a tenant already over its entitlement holds today', () => {
    const over = [
      point('2026-05', 1100, 1100, 900),
      point('2026-06', null, 1110, 910),
      point('2026-07', null, 1120, 920),
    ]
    const { basis, rows } = costOverTime(over, 1000 * GB, 0.5, 0)
    expect(basis).toBe('billable')
    expect(rows).toEqual([
      { month: '2026-06', forecastCost: 5, afterCleanUpCost: 0, afterArchiveCost: null },
      { month: '2026-07', forecastCost: 10, afterCleanUpCost: 0, afterArchiveCost: null },
    ])
  })

  it('treats a tenant at its entitlement as billable even while it shrinks, and prices nothing', () => {
    const shrinking = [point('2026-05', 100, 100, null), point('2026-06', null, 95, null), point('2026-07', null, 90, null)]
    const { basis, rows } = costOverTime(shrinking, 100 * GB, 0.5, 0)
    expect(basis).toBe('billable')
    expect(rows.map((row) => row.forecastCost)).toEqual([0, 0])
    expect(rows.map((row) => row.afterCleanUpCost)).toEqual([null, null])
  })

  it('charts the list-price value of growth inside the entitlement', () => {
    const { basis, rows } = costOverTime(points, 500 * GB, 0.5, 10 * GB)
    expect(basis).toBe('withinEntitlement')
    expect(rows.map((row) => row.forecastCost)).toEqual([5, 10])
    expect(rows.every((row) => row.afterCleanUpCost === null && row.afterArchiveCost === null)).toBe(true)
  })

  it('charts the list-price value of growth when the entitlement is unknown', () => {
    const { basis, rows } = costOverTime(points, null, 0.5, 0)
    expect(basis).toBe('notional')
    expect(rows.map((row) => row.forecastCost)).toEqual([5, 10])
  })
})
