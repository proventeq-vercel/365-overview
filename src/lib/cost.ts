import { GB_IN_BYTES } from './entitlement'

const MONTHS_PER_YEAR = 12
export const COST_YEARS = 3

export function annualGrowthGb(avgMonthlyGrowthBytes: number): number {
  return (avgMonthlyGrowthBytes * MONTHS_PER_YEAR) / GB_IN_BYTES
}

export function billableGrowthGb(addedGb: number, excessGb: number | null): number {
  const added = Math.max(0, addedGb)
  if (excessGb === null) return added
  return Math.max(0, excessGb + added) - Math.max(0, excessGb)
}

export function growthCostAnnual(growthGb: number, ratePerGb: number, excessGb: number | null): number {
  return billableGrowthGb(growthGb, excessGb) * ratePerGb * MONTHS_PER_YEAR
}

export function cumulativeGrowthCost(
  growthGbPerYear: number,
  ratePerGb: number,
  excessGb: number | null,
  years = COST_YEARS,
): number {
  let total = 0
  for (let year = 1; year <= years; year++) {
    total += billableGrowthGb(growthGbPerYear * (year - 0.5), excessGb) * ratePerGb * MONTHS_PER_YEAR
  }
  return total
}
