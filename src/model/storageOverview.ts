import type { LicenseSku, UsagePoint } from '@/types/reports'
import type {
  OneDriveLimit,
  OneDrivePool,
  OverEntitlement,
  Slice,
  StoragePool,
  StorageOverview,
  StorageRow,
} from '@/types/storage'
import { GB_IN_BYTES, estimateEntitlementBytes, oneDriveBytesPerUser } from '@/lib/entitlement'
import { archiveStatus, inactiveSince, isInactiveSince } from '@/lib/archive'
import {
  annualGrowthGb,
  billableGrowthGb,
  cumulativeGrowthCost,
  growthCostAnnual,
  growthCostStatus,
  storageCostAnnual,
} from '@/lib/cost'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import { storageBreakdown } from '@/lib/storageBreakdown'
import type { OneDriveLicences } from '@/reports/activeUsers'
import { oneDriveAttention } from './oneDriveAttention'
import { nameMaskOf } from '@/lib/concealment'
import { hideRowNames } from '@/lib/hiddenNames'
import { rowName } from '@/lib/rowName'
import { STORAGE_THRESHOLDS, utilizationStatus } from '@/lib/thresholds'
import { topNWithOther } from '@/lib/topNWithOther'
import {
  FORECAST_CHART_MONTHS,
  buildGrowthPoints,
  dailyRateBytesPerMonth,
  daysSpanned,
  exhaustionDateFor,
  forecastStatusFor,
  growthRateBytesPerMonth,
  growthRateSourceFor,
  isSeriesVolatile,
  trendWithoutGaps,
  monthlyBuckets,
  monthsToExhaustion,
  staysUnder,
} from '@/lib/forecast'

const NEAR_CAP_RATIO = 0.9

const TOP_PER_POOL = 5

const TOP_TEMPLATE_SLICES = 8

const TEAMS_TEMPLATE_MARKERS = ['TEAMCHANNEL', 'TEAM CHANNEL', 'GROUP']

export interface OverviewInputs {
  sites: StorageRow[]
  drives: StorageRow[]
  sharePointTrend: UsagePoint[]
  oneDriveTrend: UsagePoint[]
  skus: LicenseSku[] | null
  reportRefreshDate: string
  ratePerGb: number
  currency: string
  entitlementOverrideBytes: number | null
  oneDriveEntitlementOverrideBytes: number | null
  oneDriveLicences?: OneDriveLicences | null
  inactiveYears?: number
  now?: Date
  forceUnknownEntitlement?: boolean
  namesHidden?: boolean
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

const usedFrom = (trend: UsagePoint[], rows: StorageRow[]): number =>
  trend.length === 0 ? sumBytes(rows) : latest(trend)

function reportedDays(trend: UsagePoint[], rows: StorageRow[]): UsagePoint[] {
  const days = trendWithoutGaps(trend)
  return days.every((point) => point.value === 0) && sumBytes(rows) > 0 ? [] : days
}

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

function largest(rows: StorageRow[], limit: number): Slice[] {
  return [...rows]
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .slice(0, limit)
    .map((row) => ({ name: rowName(row), value: row.storageUsedBytes }))
}

function topByPool(rows: StorageRow[], pool: StoragePool): Slice[] {
  return largest(
    rows.filter((row) => row.pool === pool),
    TOP_PER_POOL,
  )
}

function commonestDriveLimit(liveDrives: StorageRow[]): OneDriveLimit | null {
  const counts = new Map<number, number>()
  for (const drive of liveDrives) {
    const limit = drive.allocatedBytes ?? 0
    if (limit > 0) counts.set(limit, (counts.get(limit) ?? 0) + 1)
  }
  let commonest: [number, number] | null = null
  for (const entry of counts) {
    if (commonest === null || entry[1] > commonest[1] || (entry[1] === commonest[1] && entry[0] > commonest[0])) {
      commonest = entry
    }
  }
  return commonest === null ? null : { basis: 'driveLimit', perUserBytes: commonest[0], drivesReporting: commonest[1] }
}

function unsetDriveLimit(liveDrives: StorageRow[], licenceBytes: number | null): OneDriveLimit | null {
  return licenceBytes !== null ? { basis: 'licences', perUserBytes: licenceBytes } : commonestDriveLimit(liveDrives)
}

function drivesOverEntitlement(liveDrives: StorageRow[], limit: OneDriveLimit): OverEntitlement {
  const over = liveDrives
    .filter((drive) => drive.storageUsedBytes > limit.perUserBytes)
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .map((drive) => ({ ...drive, overEntitlementBytes: drive.storageUsedBytes - limit.perUserBytes }))
  return {
    limit,
    drives: over,
    count: over.length,
    excessBytes: over.reduce((total, drive) => total + drive.overEntitlementBytes, 0),
  }
}

function oneDrivePool(liveDrives: StorageRow[]): OneDrivePool {
  const usedBytes = sumBytes(liveDrives)
  const limited = liveDrives.filter((drive) => (drive.allocatedBytes ?? 0) > 0)
  if (limited.length === 0) return { usedBytes, allocation: null }
  const unlimited = liveDrives.filter((drive) => (drive.allocatedBytes ?? 0) <= 0)
  const limitedUsedBytes = sumBytes(limited)
  const allocatedBytes = limited.reduce((total, drive) => total + (drive.allocatedBytes ?? 0), 0)
  const usedShare = Math.min(1, limitedUsedBytes / allocatedBytes)
  return {
    usedBytes,
    allocation: {
      allocatedBytes,
      usedBytes: limitedUsedBytes,
      driveCount: limited.length,
      withoutLimit: { count: unlimited.length, bytes: sumBytes(unlimited) },
      freeBytes: Math.max(0, allocatedBytes - limitedUsedBytes),
      usedShare,
      freeShare: 1 - usedShare,
    },
  }
}

const positiveOrNull = (bytes: number | null): number | null =>
  bytes !== null && bytes > 0 ? bytes : null

export function buildStorageOverview(inputs: OverviewInputs): StorageOverview {
  const {
    sites: reportedSites,
    drives: reportedDrives,
    sharePointTrend: reportedSharePointTrend,
    oneDriveTrend: reportedOneDriveTrend,
    skus,
    reportRefreshDate,
    ratePerGb,
    currency,
    entitlementOverrideBytes,
    oneDriveEntitlementOverrideBytes,
    oneDriveLicences = null,
    inactiveYears = DEFAULT_SETTINGS.inactiveYears,
    now = new Date(),
    forceUnknownEntitlement = false,
    namesHidden = false,
  } = inputs

  const sharePointTrend = reportedDays(reportedSharePointTrend, reportedSites)
  const oneDriveTrend = reportedDays(reportedOneDriveTrend, reportedDrives)

  const nameMask = nameMaskOf([...reportedSites, ...reportedDrives], namesHidden)
  const sites = nameMask === null ? reportedSites : reportedSites.map(hideRowNames)
  const drives = nameMask === null ? reportedDrives : reportedDrives.map(hideRowNames)

  const override = positiveOrNull(entitlementOverrideBytes)
  const oneDriveLicencePerUserBytes = skus === null ? null : oneDriveBytesPerUser(skus)
  const oneDriveOverrideBytes = positiveOrNull(oneDriveEntitlementOverrideBytes)
  const licenceEstimateBytes = skus === null ? null : estimateEntitlementBytes(skus)
  const entitledBytes = forceUnknownEntitlement ? null : (override ?? licenceEstimateBytes)
  const entitlementIsMeasured = entitledBytes !== null && override !== null

  const sharePointUsed = usedFrom(sharePointTrend, sites)
  const oneDriveUsed = usedFrom(oneDriveTrend, drives)

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
  const liveDrives = drives.filter((drive) => !drive.isDeleted)
  const limitWhenUnset = unsetDriveLimit(liveDrives, oneDriveLicencePerUserBytes)
  const driveLimit: OneDriveLimit | null =
    oneDriveOverrideBytes === null ? limitWhenUnset : { basis: 'set', perUserBytes: oneDriveOverrideBytes }
  const rows = [...sites, ...drives]

  const buckets = monthlyBuckets(
    sharePointTrend.length > 0
      ? sharePointTrend
      : [{ date: reportRefreshDate || now.toISOString().slice(0, 10), value: sharePointUsed }],
  )
  const rateSource = growthRateSourceFor(buckets, sharePointTrend)
  const rate =
    rateSource === 'monthly'
      ? growthRateBytesPerMonth(buckets)
      : rateSource === 'daily'
        ? dailyRateBytesPerMonth(sharePointTrend)
        : 0
  const addedInWindowBytes =
    rateSource === 'monthly'
      ? (buckets.at(-1)?.bytes ?? 0) - (buckets[0]?.bytes ?? 0)
      : (sharePointTrend.at(-1)?.value ?? 0) - (sharePointTrend[0]?.value ?? 0)
  const runway = exhausted
    ? 0
    : rateSource === 'none'
      ? null
      : monthsToExhaustion(sharePointUsed, entitledBytes, rate)

  const archiveCutoff = inactiveSince(reportRefreshDate, inactiveYears, now)
  const archivable = liveSites.filter((site) => isInactiveSince(site, archiveCutoff))
  const archivableBytes = sumBytes(archivable)
  const liveSiteBytes = sumBytes(liveSites)
  const archivableShare = liveSiteBytes > 0 ? archivableBytes / liveSiteBytes : 0
  const savingBytes =
    overageBytes === null ? archivableBytes : Math.min(archivableBytes, overageBytes)
  const activeTeamsBytes = sumBytes(
    liveSites.filter(
      (site) =>
        classifyWorkload(site.template) === 'Teams' && !isInactiveSince(site, archiveCutoff),
    ),
  )
  const deletedSites = retainedTotal(sites)
  const deletedDrives = retainedTotal(drives)

  const removableBytes = archivableBytes + deletedSites.bytes
  const points = buildGrowthPoints(
    buckets,
    rate,
    rateSource === 'none' ? 0 : FORECAST_CHART_MONTHS,
    removableBytes,
  )

  const growthGb = annualGrowthGb(rate)
  const excessGb = entitledBytes === null ? null : (sharePointUsed - entitledBytes) / GB_IN_BYTES
  const growthAnnual = growthCostAnnual(growthGb, ratePerGb, excessGb)

  return {
    reportRefreshDate,

    sharePoint: {
      usedBytes: sharePointUsed,
      usedFromSiteReport: sharePointTrend.length === 0,
      entitledBytes,
      remainingBytes,
      usedPercentage,
      headroomRatio,
      overageBytes,
      exhausted,
      utilization,
      entitlementIsMeasured,
      licenceEstimateBytes,
      byTemplate: topNWithOther(
        totalsBy(liveSites, (site) => site.template || 'Unknown'),
        TOP_TEMPLATE_SLICES,
        ([, value]) => value,
        ([name]) => name,
      ),
      sites,
      siteCount: liveSites.length,
      deletedButBilling: deletedSites,
    },

    oneDrive: {
      usedBytes: oneDriveUsed,
      usedFromAccountReport: oneDriveTrend.length === 0,
      drives,
      driveCount: liveDrives.length,
      drivesNearCap: liveDrives.filter(
        (drive) =>
          drive.allocatedBytes !== undefined &&
          drive.allocatedBytes > 0 &&
          drive.storageUsedBytes / drive.allocatedBytes >= NEAR_CAP_RATIO,
      ).length,
      deletedButBilling: deletedDrives,
      licenceEstimatePerUserBytes: oneDriveLicencePerUserBytes,
      licenceGap: oneDriveLicencePerUserBytes !== null ? null : skus === null ? 'licencesUnavailable' : 'noSizedPlan',
      limitWhenUnset: limitWhenUnset === null ? null : limitWhenUnset.basis === 'licences' ? 'licences' : 'driveLimit',
      overEntitlement: driveLimit === null ? null : drivesOverEntitlement(liveDrives, driveLimit),
      pool: oneDrivePool(liveDrives),
      attention: oneDriveAttention({
        drives: reportedDrives,
        licences: oneDriveLicences,
        reportRefreshDate,
        inactiveYears,
        now,
      }),
    },

    breakdown: storageBreakdown({
      sharePointUsedBytes: sharePointUsed,
      teamsBytes: activeTeamsBytes,
      inactiveBytes: archivableBytes,
      deletedSiteBytes: deletedSites.bytes,
      deletedCount: deletedSites.count,
      freeBytes: remainingBytes,
    }),

    offenders: {
      rows,
      poolUsedBytes: { SharePoint: sharePointUsed, OneDrive: oneDriveUsed },
      topSites: topByPool(rows, 'SharePoint'),
      topDrives: topByPool(rows, 'OneDrive'),
      retained: retainedTotal(rows),
    },

    growth: {
      avgMonthlyGrowthBytes: rate,
      addedInWindowBytes,
      windowMonths: Math.max(0, buckets.length - 1),
      windowDays: daysSpanned(sharePointTrend),
      rateSource,
      seriesIsVolatile: rateSource === 'monthly' && isSeriesVolatile(buckets),
      points,
      forecastStatus: exhausted
        ? 'Critical'
        : forecastStatusFor(runway, rateSource, entitledBytes !== null),
      forecastExhaustionDate: exhausted ? null : exhaustionDateFor(runway, now),
      forecastMonthsToExhaustion: runway,
      forecastEndBytes: points.at(-1)?.projectedUsedBytes ?? sharePointUsed,
      afterCleanUp: {
        inactiveBytes: archivableBytes,
        deletedBytes: deletedSites.bytes,
        removableBytes,
        endBytes: rateSource === 'none' ? null : (points.at(-1)?.afterCleanUpBytes ?? null),
        staysUnderEntitlement:
          rateSource === 'none'
            ? null
            : staysUnder(
                points.map((point) => point.afterCleanUpBytes),
                entitledBytes,
              ),
      },
    },

    archive: {
      inactiveYears,
      inactiveSince: archiveCutoff,
      siteCount: archivable.length,
      bytes: archivableBytes,
      shareOfSharePoint: archivableShare,
      status: archiveStatus(archivableShare),
      savingApplies: entitledBytes === null || exhausted,
      savingBytes,
      annualSaving: storageCostAnnual(savingBytes, ratePerGb),
    },

    cost: {
      applies: rateSource !== 'none',
      ratePerGb,
      currency,
      growthAnnual,
      growthAnnualStatus: growthCostStatus(
        growthAnnual,
        billableGrowthGb(growthGb, excessGb),
        entitledBytes === null ? null : entitledBytes / GB_IN_BYTES,
      ),
      cumulativeYear3: cumulativeGrowthCost(growthGb, ratePerGb, excessGb),
    },

    caveats: {
      entitlementIsEstimated: entitledBytes !== null && !entitlementIsMeasured,
      nameMask,
    },
  }
}
