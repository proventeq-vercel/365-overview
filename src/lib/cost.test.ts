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
  it('prices a year of growth at the monthly rate, as P365 does', () => {
    expect(growthCostAnnual(120, 0.2)).toBeCloseTo(288, 2)
  })

  it('prices the growth whether or not it fits inside the entitlement', () => {
    expect(growthCostAnnual(120, 0.02)).toBeCloseTo(28.8, 2)
  })

  it('is zero for a flat tenant', () => {
    expect(growthCostAnnual(0, 0.2)).toBe(0)
  })

  it('prices nothing for a shrinking tenant', () => {
    expect(growthCostAnnual(-120, 0.2)).toBe(0)
  })
})

describe('cumulativeGrowthCost', () => {
  it('prices each year on its mid-year average volume, and sums the years', () => {
    expect(cumulativeGrowthCost(100, 1)).toBeCloseTo(450 * 12, 2)
  })

  it('is zero for a flat tenant', () => {
    expect(cumulativeGrowthCost(0, 1)).toBe(0)
  })

  it('prices nothing for a shrinking tenant', () => {
    expect(cumulativeGrowthCost(-100, 1)).toBe(0)
  })

  it('prices mid-year volume, which is strictly less than year-end volume', () => {
    const midYear = cumulativeGrowthCost(100, 1, 1)
    const yearEndVolume = 100 * 1 * 12
    expect(midYear).toBeCloseTo(50 * 12, 2)
    expect(midYear).toBeLessThan(yearEndVolume)
  })

  it('accrues over three years by default', () => {
    expect(COST_YEARS).toBe(3)
    expect(cumulativeGrowthCost(100, 1)).toBe(cumulativeGrowthCost(100, 1, 3))
  })

  it('scales with the rate', () => {
    expect(cumulativeGrowthCost(100, 0.02)).toBeCloseTo(450 * 12 * 0.02, 2)
  })
})
