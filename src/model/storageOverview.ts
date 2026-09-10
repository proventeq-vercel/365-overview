import type { LicenseSku, UsagePoint } from '@/types/reports'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { GB_IN_BYTES, estimateEntitlementBytes } from '@/lib/entitlement'
import { annualGrowthGb, cumulativeGrowthCost, growthCostAnnual } from '@/lib/cost'
import { namesAreConcealed } from '@/lib/concealment'
import { topNWithOther } from '@/lib/topNWithOther'
import {
  FORECAST_CHART_MONTHS,
  FORECAST_WINDOW_MONTHS,
  buildGrowthPoints,
  exhaustionDateFor,
  forecastStatusFor,
  growthRateBytesPerMonth,
  isSeriesVolatile,
  monthlyBuckets,
  monthsToExhaustion,
} from '@/lib/forecast'

export const NEAR_CAP_RATIO = 0.9

const TOP_TEMPLATE_SLICES = 8

const TEAMS_TEMPLATE_MARKERS = ['TEAMCHANNEL', 'GROUP#']

export interface OverviewInputs {
  sites: StorageRow[]
  drives: StorageRow[]
  sharePointTrend: UsagePoint[]
  oneDriveTrend: UsagePoint[]
  skus: LicenseSku[]
  reportRefreshDate: string
  ratePerGb: number
  currency: string
  entitlementOverrideBytes: number | null
  now?: Date
  forceUnknownEntitlement?: boolean
}

export function classifyWorkload(template?: string): 'SharePoint' | 'Teams' {
  const upper = (template ?? '').toUpperCase()
  return TEAMS_TEMPLATE_MARKERS.some((marker) => upper.includes(marker))
    ? 'Teams'
    : 'SharePoint'
}

const latest = (series: UsagePoint[]): number =>
  series.length === 0 ? 0 : series[series.length - 1].value

const sumBytes = (rows: StorageRow[]): number =>
  rows.reduce((total, row) => total + row.storageUsedBytes, 0)

function totalsBy(rows: StorageRow[], key: (row: StorageRow) => string) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const name = key(row)
    totals.set(name, (totals.get(name) ?? 0) + row.storageUsedBytes)
  }
  return [...totals.entries()]
}

export function buildStorageOverview(inputs: OverviewInputs): StorageOverview {
  const {
    sites,
    drives,
    sharePointTrend,
    oneDriveTrend,
    skus,
    reportRefreshDate,
    ratePerGb,
    currency,
    entitlementOverrideBytes,
    now = new Date(),
    forceUnknownEntitlement = false,
  } = inputs

  const entitledBytes = forceUnknownEntitlement
    ? null
    : (entitlementOverrideBytes ?? estimateEntitlementBytes(skus))
  const entitlementIsMeasured = entitlementOverrideBytes !== null

  const sharePointUsed = latest(sharePointTrend)
  const oneDriveUsed = latest(oneDriveTrend)

  const remainingBytes = entitledBytes === null ? null : entitledBytes - sharePointUsed
  const usedPercentage =
    entitledBytes === null || entitledBytes <= 0 ? null : sharePointUsed / entitledBytes

  const liveSites = sites.filter((site) => !site.isDeleted)
  const deletedSites = sites.filter((site) => site.isDeleted)
  const deletedDrives = drives.filter((drive) => drive.isDeleted)

  const buckets = monthlyBuckets(sharePointTrend)
  const rate = growthRateBytesPerMonth(buckets)
  const historyTooShort = buckets.length < FORECAST_WINDOW_MONTHS
  const runway = historyTooShort
    ? null
    : monthsToExhaustion(sharePointUsed, entitledBytes, rate)
  const points = buildGrowthPoints(buckets, rate, FORECAST_CHART_MONTHS)

  const growthGb = annualGrowthGb(rate)
  const headroomGb =
    remainingBytes === null ? null : Math.max(0, remainingBytes) / GB_IN_BYTES

  return {
    reportRefreshDate,

    sharePoint: {
      usedBytes: sharePointUsed,
      entitledBytes,
      remainingBytes,
      usedPercentage,
      entitlementIsMeasured,
      byWorkload: totalsBy(liveSites, (site) => classifyWorkload(site.template)).map(
        ([name, value]) => ({ name, value }),
      ),
      byTemplate: topNWithOther(
        totalsBy(liveSites, (site) => site.template || 'Unknown'),
        TOP_TEMPLATE_SLICES,
        ([, value]) => value,
        ([name]) => name,
      ),
      sites,
      deletedButBilling: { bytes: sumBytes(deletedSites), count: deletedSites.length },
    },

    oneDrive: {
      usedBytes: oneDriveUsed,
      drives,
      drivesNearCap: drives.filter(
        (drive) =>
          drive.allocatedBytes !== undefined &&
          drive.allocatedBytes > 0 &&
          drive.storageUsedBytes / drive.allocatedBytes >= NEAR_CAP_RATIO,
      ).length,
      deletedButBilling: { bytes: sumBytes(deletedDrives), count: deletedDrives.length },
    },

    growth: {
      avgMonthlyGrowthBytes: rate,
      windowMonths: buckets.length,
      seriesIsVolatile: isSeriesVolatile(buckets),
      points,
      forecastStatus: forecastStatusFor(runway, historyTooShort, entitledBytes !== null),
      forecastExhaustionDate: exhaustionDateFor(runway, now),
      forecastMonthsToExhaustion: runway,
      forecastEndBytes: points.at(-1)?.projectedUsedBytes ?? sharePointUsed,
    },

    cost: {
      ratePerGb,
      currency,
      growthNotionalAnnual: growthCostAnnual(growthGb, 0, ratePerGb) ?? 0,
      growthBillableAnnual: growthCostAnnual(growthGb, headroomGb, ratePerGb),
      cumulativeNotionalYear3: cumulativeGrowthCost(growthGb, 0, ratePerGb) ?? 0,
      cumulativeBillableYear3: cumulativeGrowthCost(growthGb, headroomGb, ratePerGb),
    },

    caveats: {
      entitlementIsEstimated: entitledBytes !== null && !entitlementIsMeasured,
      namesAreConcealed: namesAreConcealed([...sites, ...drives]),
      historyTooShort,
    },
  }
}
