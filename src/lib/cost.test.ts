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
  it('prices a year of growth at the monthly rate when there is no headroom', () => {
    expect(growthCostAnnual(120, 0.2)).toBeCloseTo(288, 2)
  })

  it('prices only the growth past the headroom', () => {
    expect(growthCostAnnual(120, 0.2, 50)).toBeCloseTo(168, 2)
  })

  it('is zero when the growth fits inside the headroom', () => {
    expect(growthCostAnnual(120, 0.2, 500)).toBe(0)
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

  it('averages each year between its start and end overage past the headroom, as P365', () => {
    expect(cumulativeGrowthCost(120, 0.2, 50)).toBeCloseTo(996, 2)
  })

  it('is zero while the growth stays inside the headroom for all three years', () => {
    expect(cumulativeGrowthCost(100, 1, 300)).toBe(0)
  })

  it('is zero for a flat tenant', () => {
    expect(cumulativeGrowthCost(0, 1)).toBe(0)
  })

  it('prices nothing for a shrinking tenant', () => {
    expect(cumulativeGrowthCost(-100, 1)).toBe(0)
  })

  it('accrues over three years by default', () => {
    expect(COST_YEARS).toBe(3)
    expect(cumulativeGrowthCost(100, 1, 0, 1)).toBeCloseTo(50 * 12, 2)
  })
})
