import { describe, it, expect } from 'vitest'
import { GB_IN_BYTES } from './entitlement'
import { COST_YEARS, annualGrowthGb, cumulativeGrowthCost, growthCostAnnual } from './cost'

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

describe('growthCostAnnual', () => {
  it('bills a full year of growth at the monthly rate when there is no headroom', () => {
    expect(growthCostAnnual(120, 0, 0.2)).toBeCloseTo(288, 2)
  })

  it('is zero while a year of growth still fits inside the entitlement', () => {
    expect(growthCostAnnual(120, 500, 0.2)).toBe(0)
  })

  it('bills only the part that exceeds headroom', () => {
    expect(growthCostAnnual(120, 100, 0.2)).toBeCloseTo(20 * 0.2 * 12, 2)
  })

  it('bills nothing for a shrinking tenant', () => {
    expect(growthCostAnnual(-120, 0, 0.2)).toBe(0)
  })
})

describe('cumulativeGrowthCost', () => {
  it('bills each year on its mid-year average overage, and sums the years', () => {
    expect(cumulativeGrowthCost(100, 0, 1)).toBeCloseTo(450 * 12, 2)
  })

  it('is zero while three years of growth stay inside headroom', () => {
    expect(cumulativeGrowthCost(100, 1000, 1)).toBe(0)
  })

  it('counts only the years that actually overflow', () => {
    expect(cumulativeGrowthCost(100, 100, 1)).toBeCloseTo(200 * 12, 2)
  })

  it('is less than the same figure computed with zero headroom', () => {
    const withHeadroom = cumulativeGrowthCost(100, 100, 1)
    const notional = cumulativeGrowthCost(100, 0, 1)
    expect(withHeadroom).toBeLessThan(notional!)
  })

  it('bills mid-year volume, which is strictly less than year-end volume', () => {
    const midYear = cumulativeGrowthCost(100, 0, 1, 1)
    const yearEndVolume = 100 * 1 * 12
    expect(midYear).toBeCloseTo(50 * 12, 2)
    expect(midYear).toBeLessThan(yearEndVolume)
  })

  it('accrues over three years by default', () => {
    expect(COST_YEARS).toBe(3)
    expect(cumulativeGrowthCost(100, 0, 1)).toBe(cumulativeGrowthCost(100, 0, 1, 3))
  })
})
