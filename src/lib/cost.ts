import { GB_IN_BYTES } from './entitlement'

const MONTHS_PER_YEAR = 12
export const COST_YEARS = 3

export function annualGrowthGb(avgMonthlyGrowthBytes: number): number {
  return (avgMonthlyGrowthBytes * MONTHS_PER_YEAR) / GB_IN_BYTES
}

export function growthCostAnnual(growthGb: number, ratePerGb: number): number {
  return Math.max(0, growthGb) * ratePerGb * MONTHS_PER_YEAR
}

export function cumulativeGrowthCost(
  growthGbPerYear: number,
  ratePerGb: number,
  years = COST_YEARS,
): number {
  let total = 0
  for (let year = 1; year <= years; year++) {
    const midYearVolumeGb = Math.max(0, growthGbPerYear * (year - 0.5))
    total += midYearVolumeGb * ratePerGb * MONTHS_PER_YEAR
  }
  return total
}
