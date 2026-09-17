import type { LicenseSku, UsagePoint } from '@/types/reports'
import type { Slice, StoragePool, StorageOverview, StorageRow } from '@/types/storage'
import { GB_IN_BYTES, estimateEntitlementBytes } from '@/lib/entitlement'
import { annualGrowthGb, cumulativeGrowthCost, growthCostAnnual } from '@/lib/cost'
import { namesAreConcealed } from '@/lib/concealment'
import { rowLabel } from '@/lib/rowName'
import { STORAGE_THRESHOLDS, utilizationStatus } from '@/lib/thresholds'
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

const NEAR_CAP_RATIO = 0.9

const TOP_CONSUMERS = 10
const TOP_PER_POOL = 5

const TOP_TEMPLATE_SLICES = 8

const TEAMS_TEMPLATE_MARKERS = ['TEAMCHANNEL', 'TEAM CHANNEL', 'GROUP']

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

const retainedTotal = (rows: StorageRow[]) => {
  const deleted = rows.filter((row) => row.isDeleted)
  return { bytes: sumBytes(deleted), count: deleted.length }
}

function totalsBy(rows: StorageRow[], key: (row: StorageRow) => string) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const name = key(row)
    totals.set(name, (totals.get(name) ?? 0) + row.storageUsedBytes)
  }
  return [...totals.entries()]
}

function topConsumers(rows: StorageRow[], limit = TOP_CONSUMERS): Slice[] {
  return [...rows]
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .slice(0, limit)
    .map((row) => ({ name: rowLabel(row), value: row.storageUsedBytes }))
}

function topByPool(rows: StorageRow[], pool: StoragePool): Slice[] {
  return topConsumers(
    rows.filter((row) => row.pool === pool),
    TOP_PER_POOL,
  )
}

const positiveOrNull = (bytes: number | null): number | null =>
  bytes !== null && bytes > 0 ? bytes : null

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

  const override = positiveOrNull(entitlementOverrideBytes)
  const licenceEstimateBytes = estimateEntitlementBytes(skus)
  const entitledBytes = forceUnknownEntitlement ? null : (override ?? licenceEstimateBytes)
  const entitlementIsMeasured = entitledBytes !== null && override !== null

  const sharePointUsed = latest(sharePointTrend)
  const oneDriveUsed = latest(oneDriveTrend)

  const remainingBytes = entitledBytes === null ? null : Math.max(0, entitledBytes - sharePointUsed)
  const usedPercentage = entitledBytes === null ? null : sharePointUsed / entitledBytes
  const headroomRatio = usedPercentage === null ? null : Math.max(0, 1 - usedPercentage)
  const overageBytes = entitledBytes === null ? null : Math.max(0, sharePointUsed - entitledBytes)
  const exhausted = entitledBytes !== null && sharePointUsed >= entitledBytes
  const utilization =
    entitledBytes === null
      ? null
      : utilizationStatus(sharePointUsed, entitledBytes, STORAGE_THRESHOLDS)

  const liveSites = sites.filter((site) => !site.isDeleted)
  const rows = [...sites, ...drives]

  const buckets = monthlyBuckets(sharePointTrend)
  const rate = growthRateBytesPerMonth(buckets)
  const historyTooShort = buckets.length < FORECAST_WINDOW_MONTHS
  const runway = exhausted
    ? 0
    : historyTooShort
      ? null
      : monthsToExhaustion(sharePointUsed, entitledBytes, rate)
  const points = buildGrowthPoints(buckets, rate, FORECAST_CHART_MONTHS)

  const growthGb = annualGrowthGb(rate)
  const headroomGb = remainingBytes === null ? null : remainingBytes / GB_IN_BYTES

  return {
    reportRefreshDate,

    sharePoint: {
      usedBytes: sharePointUsed,
      entitledBytes,
      remainingBytes,
      usedPercentage,
      headroomRatio,
      overageBytes,
      utilization,
      entitlementIsMeasured,
      licenceEstimateBytes,
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
      siteCount: liveSites.length,
      deletedButBilling: retainedTotal(sites),
    },

    oneDrive: {
      usedBytes: oneDriveUsed,
      drives,
      driveCount: drives.filter((drive) => !drive.isDeleted).length,
      drivesNearCap: drives.filter(
        (drive) =>
          drive.allocatedBytes !== undefined &&
          drive.allocatedBytes > 0 &&
          drive.storageUsedBytes / drive.allocatedBytes >= NEAR_CAP_RATIO,
      ).length,
      deletedButBilling: retainedTotal(drives),
    },

    offenders: {
      rows,
      totalUsedBytes: sharePointUsed + oneDriveUsed,
      topConsumers: topConsumers(rows),
      topSites: topByPool(rows, 'SharePoint'),
      topDrives: topByPool(rows, 'OneDrive'),
      retained: retainedTotal(rows),
    },

    growth: {
      avgMonthlyGrowthBytes: rate,
      addedInWindowBytes: (buckets.at(-1)?.bytes ?? 0) - (buckets[0]?.bytes ?? 0),
      windowMonths: Math.max(0, buckets.length - 1),
      seriesIsVolatile: isSeriesVolatile(buckets),
      points,
      forecastStatus: exhausted
        ? 'Critical'
        : forecastStatusFor(runway, historyTooShort, entitledBytes !== null),
      forecastExhaustionDate: exhausted ? null : exhaustionDateFor(runway, now),
      forecastMonthsToExhaustion: runway,
      forecastEndBytes: points.at(-1)?.projectedUsedBytes ?? sharePointUsed,
    },

    cost: {
      ratePerGb,
      currency,
      growthNotionalAnnual: growthCostAnnual(growthGb, 0, ratePerGb),
      growthBillableAnnual:
        headroomGb === null ? null : growthCostAnnual(growthGb, headroomGb, ratePerGb),
      cumulativeNotionalYear3: cumulativeGrowthCost(growthGb, 0, ratePerGb),
      cumulativeBillableYear3:
        headroomGb === null ? null : cumulativeGrowthCost(growthGb, headroomGb, ratePerGb),
    },

    caveats: {
      entitlementIsEstimated: entitledBytes !== null && !entitlementIsMeasured,
      namesAreConcealed: namesAreConcealed(rows),
      historyTooShort,
    },
  }
}
