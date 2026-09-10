import type { UsagePoint } from '@/types/reports'
import type { ForecastStatus, GrowthPoint } from '@/types/storage'

export const FORECAST_WINDOW_MONTHS = 6
export const CRITICAL_MONTHS = 12
export const WARNING_MONTHS = 36
export const HORIZON_MONTHS = 120
export const FORECAST_CHART_MONTHS = 6
export const VOLATILITY_DIVERGENCE = 0.5

export interface MonthBucket {
  month: string
  bytes: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function addMonths(month: string, count: number): string {
  const [year, monthOfYear] = month.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, monthOfYear - 1 + count, 1))
  const paddedMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${paddedMonth}`
}

export function monthlyBuckets(daily: UsagePoint[]): MonthBucket[] {
  const byMonth = new Map<string, { date: string; bytes: number }>()
  for (const point of daily) {
    const month = point.date.slice(0, 7)
    const existing = byMonth.get(month)
    if (!existing || point.date >= existing.date) {
      byMonth.set(month, { date: point.date, bytes: point.value })
    }
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { bytes }]) => ({ month, bytes }))
}

export function growthRateBytesPerMonth(buckets: MonthBucket[]): number {
  if (buckets.length < 2) return 0
  const deltas = buckets.slice(1).map((bucket, i) => bucket.bytes - buckets[i].bytes)
  return median(deltas)
}

export function isSeriesVolatile(buckets: MonthBucket[]): boolean {
  if (buckets.length < 2) return false
  const medianRate = growthRateBytesPerMonth(buckets)
  const endpointRate =
    (buckets[buckets.length - 1].bytes - buckets[0].bytes) / (buckets.length - 1)
  if (medianRate === 0) return endpointRate !== 0
  return Math.abs(endpointRate - medianRate) > VOLATILITY_DIVERGENCE * Math.abs(medianRate)
}

export function monthsToExhaustion(
  usedBytes: number,
  entitledBytes: number | null,
  ratePerMonth: number,
): number | null {
  if (entitledBytes === null) return null
  const remaining = entitledBytes - usedBytes
  if (remaining <= 0) return 0
  if (ratePerMonth <= 0) return null
  return Math.floor(remaining / ratePerMonth)
}

export function forecastStatusFor(
  months: number | null,
  historyTooShort: boolean,
  hasEntitlement: boolean,
): ForecastStatus {
  if (!hasEntitlement || historyTooShort) return 'Unknown'
  if (months === null) return 'Healthy'
  if (months < CRITICAL_MONTHS) return 'Critical'
  if (months < WARNING_MONTHS) return 'Warning'
  return 'Healthy'
}

export function exhaustionDateFor(months: number | null, from: Date): string | null {
  if (months === null || months > HORIZON_MONTHS) return null
  const exhaustsOn = new Date(from)
  exhaustsOn.setUTCMonth(exhaustsOn.getUTCMonth() + months)
  return exhaustsOn.toISOString().slice(0, 10)
}

export function buildGrowthPoints(
  buckets: MonthBucket[],
  ratePerMonth: number,
  aheadMonths: number,
): GrowthPoint[] {
  if (buckets.length === 0) return []
  const last = buckets[buckets.length - 1]

  const history: GrowthPoint[] = buckets.map((bucket, i) => ({
    month: bucket.month,
    actualUsedBytes: bucket.bytes,
    projectedUsedBytes: i === buckets.length - 1 ? bucket.bytes : null,
  }))

  const future: GrowthPoint[] = Array.from({ length: aheadMonths }, (_, i) => ({
    month: addMonths(last.month, i + 1),
    actualUsedBytes: null,
    projectedUsedBytes: Math.max(0, last.bytes + ratePerMonth * (i + 1)),
  }))

  return [...history, ...future]
}
