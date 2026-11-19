import type { GrowthPoint } from '@/types/storage'
import { GB_IN_BYTES } from './entitlement'
import { afterArchiveBytes } from './forecast'
import type { HealthStatus } from './thresholds'

const MONTHS_PER_YEAR = 12
export const COST_YEARS = 3
export const COST_ATTENTION_SHARE_OF_ENTITLEMENT = 0.1

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

export function storageCostAnnual(bytes: number, ratePerGb: number): number {
  return (bytes / GB_IN_BYTES) * ratePerGb * MONTHS_PER_YEAR
}

export function growthCostStatus(
  annualCost: number,
  billableGb: number,
  entitledGb: number | null,
): HealthStatus {
  if (annualCost <= 0) return 'healthy'
  if (entitledGb === null) return 'watch'
  return billableGb > COST_ATTENTION_SHARE_OF_ENTITLEMENT * entitledGb ? 'attention' : 'watch'
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

export type CostBasis = 'billable' | 'withinEntitlement' | 'notional'

export interface CostRow {
  month: string
  forecastCost: number
  afterCleanUpCost: number | null
  afterArchiveCost: number | null
}

export interface CostOverTime {
  basis: CostBasis
  rows: CostRow[]
}

function monthlyCostAbove(bytes: number, entitledBytes: number, ratePerGb: number): number {
  return (Math.max(0, bytes - entitledBytes) / GB_IN_BYTES) * ratePerGb
}

export function costOverTime(
  points: GrowthPoint[],
  entitledBytes: number | null,
  ratePerGb: number,
  archivedBytes: number,
): CostOverTime {
  const forecast = points.filter((point) => point.actualUsedBytes === null)
  const projected = (point: GrowthPoint) => point.projectedUsedBytes ?? 0
  const billable =
    entitledBytes !== null && forecast.some((point) => projected(point) > entitledBytes)
  const basis: CostBasis = billable
    ? 'billable'
    : entitledBytes === null
      ? 'notional'
      : 'withinEntitlement'

  if (entitledBytes === null || !billable) {
    const today = points.findLast((point) => point.actualUsedBytes !== null)?.actualUsedBytes ?? 0
    return {
      basis,
      rows: forecast.map((point) => ({
        month: point.month,
        forecastCost: (Math.max(0, projected(point) - today) / GB_IN_BYTES) * ratePerGb,
        afterCleanUpCost: null,
        afterArchiveCost: null,
      })),
    }
  }

  const costOf = (bytes: number | null) =>
    bytes === null ? null : monthlyCostAbove(bytes, entitledBytes, ratePerGb)
  return {
    basis,
    rows: forecast.map((point) => ({
      month: point.month,
      forecastCost: monthlyCostAbove(projected(point), entitledBytes, ratePerGb),
      afterCleanUpCost: costOf(point.afterCleanUpBytes),
      afterArchiveCost: archivedBytes > 0 ? costOf(afterArchiveBytes(point, archivedBytes)) : null,
    })),
  }
}
