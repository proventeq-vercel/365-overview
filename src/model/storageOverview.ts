import type { LicenseSku, UsagePoint } from '@/types/reports'
import type {
  CleanUpUnavailable,
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
import { nameMaskOf } from '@/lib/concealment'
import { hideRowNames } from '@/lib/hiddenNames'
import { rowName } from '@/lib/rowName'
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

function drivesOverEntitlement(liveDrives: StorageRow[], perUserBytes: number): OverEntitlement {
  const over = liveDrives
    .filter((drive) => drive.storageUsedBytes > perUserBytes)
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .map((drive) => ({ ...drive, overEntitlementBytes: drive.storageUsedBytes - perUserBytes }))
  return {
    drives: over,
    count: over.length,
    excessBytes: over.reduce((total, drive) => total + drive.overEntitlementBytes, 0),
  }
}

function oneDrivePool(liveDrives: StorageRow[], usedBytes: number): OneDrivePool {
  const allocations = liveDrives.map((drive) => drive.allocatedBytes ?? 0)
  if (allocations.length === 0 || allocations.some((bytes) => bytes <= 0)) {
    return { usedBytes, allocation: null }
  }
  const allocatedBytes = allocations.reduce((total, bytes) => total + bytes, 0)
  const usedShare = Math.min(1, usedBytes / allocatedBytes)
  return {
    usedBytes,
    allocation: {
      allocatedBytes,
      freeBytes: Math.max(0, allocatedBytes - usedBytes),
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
    sharePointTrend,
    oneDriveTrend,
    skus,
    reportRefreshDate,
    ratePerGb,
    currency,
    entitlementOverrideBytes,
    oneDriveEntitlementOverrideBytes,
    inactiveYears = DEFAULT_SETTINGS.inactiveYears,
    now = new Date(),
    forceUnknownEntitlement = false,
    namesHidden = false,
  } = inputs

  const nameMask = nameMaskOf([...reportedSites, ...reportedDrives], namesHidden)
  const sites = nameMask === null ? reportedSites : reportedSites.map(hideRowNames)
  const drives = nameMask === null ? reportedDrives : reportedDrives.map(hideRowNames)

  const override = positiveOrNull(entitlementOverrideBytes)
  const oneDriveLicencePerUserBytes = skus === null ? null : oneDriveBytesPerUser(skus)
  const oneDriveOverrideBytes = positiveOrNull(oneDriveEntitlementOverrideBytes)
  const oneDrivePerUserBytes = oneDriveOverrideBytes ?? oneDriveLicencePerUserBytes
  const licenceEstimateBytes = skus === null ? null : estimateEntitlementBytes(skus)
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
  const liveDrives = drives.filter((drive) => !drive.isDeleted)
  const rows = [...sites, ...drives]

  const buckets = monthlyBuckets(sharePointTrend)
  const rate = growthRateBytesPerMonth(buckets)
  const historyTooShort = buckets.length < FORECAST_WINDOW_MONTHS
  const runway = exhausted
    ? 0
    : historyTooShort
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
  const cleanUpUnavailable: CleanUpUnavailable | null =
    removableBytes <= 0 ? 'nothingRemovable' : historyTooShort ? 'historyTooShort' : null
  const points = buildGrowthPoints(
    buckets,
    rate,
    FORECAST_CHART_MONTHS,
    cleanUpUnavailable === null ? removableBytes : null,
  )

  const growthGb = annualGrowthGb(rate)
  const excessGb = entitledBytes === null ? null : (sharePointUsed - entitledBytes) / GB_IN_BYTES
  const growthAnnual = growthCostAnnual(growthGb, ratePerGb, excessGb)

  return {
    reportRefreshDate,

    sharePoint: {
      usedBytes: sharePointUsed,
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
      drives,
      driveCount: liveDrives.length,
      drivesNearCap: liveDrives.filter(
        (drive) =>
          drive.allocatedBytes !== undefined &&
          drive.allocatedBytes > 0 &&
          drive.storageUsedBytes / drive.allocatedBytes >= NEAR_CAP_RATIO,
      ).length,
      deletedButBilling: deletedDrives,
      entitlementPerUserBytes: oneDrivePerUserBytes,
      licenceEstimatePerUserBytes: oneDriveLicencePerUserBytes,
      entitlementPerUserIsSet: oneDriveOverrideBytes !== null,
      entitlementUnknownReason:
        oneDrivePerUserBytes !== null ? null : skus === null ? 'licencesUnavailable' : 'noSizedPlan',
      overEntitlement:
        oneDrivePerUserBytes === null
          ? null
          : drivesOverEntitlement(liveDrives, oneDrivePerUserBytes),
      pool: oneDrivePool(liveDrives, Math.max(0, oneDriveUsed - deletedDrives.bytes)),
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
      afterCleanUp: {
        inactiveBytes: archivableBytes,
        deletedBytes: deletedSites.bytes,
        removableBytes,
        endBytes: points.at(-1)?.afterCleanUpBytes ?? null,
        staysUnderEntitlement:
          cleanUpUnavailable === null
            ? staysUnder(
                points.map((point) => point.afterCleanUpBytes),
                entitledBytes,
              )
            : null,
        unavailableReason: cleanUpUnavailable,
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
      historyTooShort,
    },
  }
}
