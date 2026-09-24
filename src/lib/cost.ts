import { GB_IN_BYTES } from './entitlement'

const MONTHS_PER_YEAR = 12
export const COST_YEARS = 3

export function annualGrowthGb(avgMonthlyGrowthBytes: number): number {
  return (avgMonthlyGrowthBytes * MONTHS_PER_YEAR) / GB_IN_BYTES
}

export function growthCostAnnual(growthGb: number, ratePerGb: number, headroomGb = 0): number {
  return Math.max(0, growthGb - headroomGb) * ratePerGb * MONTHS_PER_YEAR
}

export function cumulativeGrowthCost(
  growthGbPerYear: number,
  ratePerGb: number,
  headroomGb = 0,
  years = COST_YEARS,
): number {
  let total = 0
  for (let year = 1; year <= years; year++) {
    const overageAtStart = Math.max(0, growthGbPerYear * (year - 1) - headroomGb)
    const overageAtEnd = Math.max(0, growthGbPerYear * year - headroomGb)
    total += ((overageAtStart + overageAtEnd) / 2) * ratePerGb * MONTHS_PER_YEAR
  }
  return total
}
