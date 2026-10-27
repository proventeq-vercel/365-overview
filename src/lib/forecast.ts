import type { UsagePoint } from '@/types/reports'
import type { ForecastStatus, GrowthPoint, GrowthRateSource } from '@/types/storage'

export const FORECAST_WINDOW_MONTHS = 6
export const CRITICAL_MONTHS = 12
export const WARNING_MONTHS = 36
export const HORIZON_MONTHS = 120
export const FORECAST_CHART_MONTHS = 6
export const VOLATILITY_DIVERGENCE = 0.5
export const DAYS_PER_MONTH = 365.25 / 12

const DAY_MS = 86_400_000

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

const dayNumber = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS

export function daysSpanned(daily: UsagePoint[]): number {
  if (daily.length === 0) return 0
  const days = daily.map((point) => dayNumber(point.date))
  return Math.max(...days) - Math.min(...days)
}

export function dailyRateBytesPerMonth(daily: UsagePoint[]): number {
  if (daily.length < 2) return 0
  const days = daily.map((point) => dayNumber(point.date))
  const meanDay = days.reduce((total, day) => total + day, 0) / days.length
  const meanBytes = daily.reduce((total, point) => total + point.value, 0) / daily.length
  let covariance = 0
  let variance = 0
  daily.forEach((point, i) => {
    covariance += (days[i] - meanDay) * (point.value - meanBytes)
    variance += (days[i] - meanDay) ** 2
  })
  return variance === 0 ? 0 : (covariance / variance) * DAYS_PER_MONTH
}

export function growthRateSourceFor(buckets: MonthBucket[], daily: UsagePoint[]): GrowthRateSource {
  if (buckets.length >= FORECAST_WINDOW_MONTHS) return 'monthly'
  return daysSpanned(daily) > 0 ? 'daily' : 'none'
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
  rateSource: GrowthRateSource,
  hasEntitlement: boolean,
): ForecastStatus {
  if (!hasEntitlement || rateSource === 'none') return 'Unknown'
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
  removableBytes: number | null,
): GrowthPoint[] {
  if (buckets.length === 0) return []
  const last = buckets[buckets.length - 1]
  const afterCleanUp = (bytes: number): number | null =>
    removableBytes === null ? null : Math.max(0, bytes - removableBytes)

  const history: GrowthPoint[] = buckets.map((bucket, i) => {
    const isLast = i === buckets.length - 1
    return {
      month: bucket.month,
      actualUsedBytes: bucket.bytes,
      projectedUsedBytes: isLast ? bucket.bytes : null,
      afterCleanUpBytes: isLast ? afterCleanUp(bucket.bytes) : null,
    }
  })

  const future: GrowthPoint[] = Array.from({ length: aheadMonths }, (_, i) => ({
    month: addMonths(last.month, i + 1),
    actualUsedBytes: null,
    projectedUsedBytes: Math.max(0, last.bytes + ratePerMonth * (i + 1)),
    afterCleanUpBytes: afterCleanUp(last.bytes + ratePerMonth * (i + 1)),
  }))

  return [...history, ...future]
}

export function staysUnder(values: (number | null)[], limitBytes: number | null): boolean | null {
  if (limitBytes === null) return null
  return values.every((value) => value === null || value < limitBytes)
}
