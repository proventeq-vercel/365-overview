import { GB_IN_BYTES } from './entitlement'

const MONTHS_PER_YEAR = 12
export const COST_YEARS = 3

export function annualGrowthGb(avgMonthlyGrowthBytes: number): number {
  return (avgMonthlyGrowthBytes * MONTHS_PER_YEAR) / GB_IN_BYTES
}

export function growthCostAnnual(
  growthGb: number,
  headroomGb: number | null,
  ratePerGb: number,
): number | null {
  if (headroomGb === null) return null
  const billableGb = Math.max(0, growthGb - headroomGb)
  return billableGb * ratePerGb * MONTHS_PER_YEAR
}

export function cumulativeGrowthCost(
  growthGbPerYear: number,
  headroomGb: number | null,
  ratePerGb: number,
  years = COST_YEARS,
): number | null {
  if (headroomGb === null) return null
  let total = 0
  for (let year = 1; year <= years; year++) {
    const midYearVolumeGb = growthGbPerYear * (year - 0.5)
    const overageGb = Math.max(0, midYearVolumeGb - headroomGb)
    total += overageGb * ratePerGb * MONTHS_PER_YEAR
  }
  return total
}
