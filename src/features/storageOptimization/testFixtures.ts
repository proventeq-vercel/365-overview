import type { StorageOverview } from '@/types/storage'

const GB = 1_073_741_824

export const base: StorageOverview = {
  reportRefreshDate: '2026-08-30',
  sharePoint: {
    usedBytes: 500 * GB,
    usedFromSiteReport: false,
    entitledBytes: 1000 * GB,
    remainingBytes: 500 * GB,
    usedPercentage: 0.5,
    headroomRatio: 0.5,
    overageBytes: 0,
    exhausted: false,
    utilization: 'healthy',
    entitlementIsMeasured: false,
    licenceEstimateBytes: 1000 * GB,
    byTemplate: [],
    sites: [],
    siteCount: 1089,
    deletedButBilling: { bytes: 0, count: 0 },
  },
  oneDrive: {
    usedBytes: 120 * GB,
    drives: [],
    driveCount: 40,
    drivesNearCap: 3,
    deletedButBilling: { bytes: 0, count: 0 },
    entitlementPerUserBytes: 1024 * GB,
    licenceEstimatePerUserBytes: 1024 * GB,
    entitlementPerUserIsSet: false,
    entitlementUnknownReason: null,
    overEntitlement: { drives: [], count: 7, excessBytes: 900 * GB },
    pool: {
      usedBytes: 120 * GB,
      allocation: {
        allocatedBytes: 40_960 * GB,
        freeBytes: 40_840 * GB,
        usedShare: 120 / 40_960,
        freeShare: 40_840 / 40_960,
      },
    },
    attention: {
      inactiveYears: 3,
      inactiveSince: '2023-08-30',
      inactive: {
        count: 6,
        bytes: 30 * GB,
        bands: [
          { band: 'firstYear', fromYears: 3, toYears: 4, count: 3, bytes: 12 * GB },
          { band: 'secondYear', fromYears: 4, toYears: 5, count: 1, bytes: 8 * GB },
          { band: 'older', fromYears: 5, toYears: null, count: 1, bytes: 9 * GB },
          { band: 'never', fromYears: null, toYears: null, count: 1, bytes: 1 * GB },
        ],
      },
      unlicensed: { count: 2, bytes: 40 * GB, notListed: 1 },
    },
  },
  breakdown: {
    segments: [
      { key: 'sharePoint', bytes: 200 * GB, share: 200 / 1000 },
      { key: 'teams', bytes: 170 * GB, share: 170 / 1000 },
      { key: 'deleted', bytes: 10 * GB, share: 10 / 1000 },
      { key: 'inactive', bytes: 120 * GB, share: 120 / 1000 },
      { key: 'versions', bytes: null, share: 0 },
      { key: 'free', bytes: 500 * GB, share: 500 / 1000 },
    ],
    totalBytes: 1000 * GB,
    deletedCount: 4,
  },
  offenders: {
    rows: [],
    poolUsedBytes: { SharePoint: 500 * GB, OneDrive: 120 * GB },
    topSites: [],
    topDrives: [],
    retained: { bytes: 0, count: 0 },
  },
  growth: {
    avgMonthlyGrowthBytes: 10 * GB,
    addedInWindowBytes: 50 * GB,
    windowMonths: 5,
    windowDays: 153,
    rateSource: 'monthly',
    seriesIsVolatile: false,
    points: [],
    forecastStatus: 'Healthy',
    forecastExhaustionDate: '2030-01-01',
    forecastMonthsToExhaustion: 50,
    forecastEndBytes: 560 * GB,
    afterCleanUp: {
      inactiveBytes: 120 * GB,
      deletedBytes: 0,
      removableBytes: 120 * GB,
      endBytes: 440 * GB,
      staysUnderEntitlement: true,
    },
  },
  archive: {
    inactiveYears: 3,
    inactiveSince: '2023-08-30',
    siteCount: 42,
    bytes: 120 * GB,
    shareOfSharePoint: 0.24,
    status: 'watch',
    savingApplies: false,
    savingBytes: 0,
    annualSaving: 0,
  },
  cost: {
    applies: true,
    ratePerGb: 0.02,
    currency: 'GBP',
    growthAnnual: 288,
    growthAnnualStatus: 'watch',
    cumulativeYear3: 1296,
  },
  caveats: {
    entitlementIsEstimated: true,
    nameMask: null,
  },
}

export const unknownEntitlement: StorageOverview = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    entitledBytes: null,
    remainingBytes: null,
    usedPercentage: null,
    headroomRatio: null,
    overageBytes: null,
    utilization: null,
  },
  growth: {
    ...base.growth,
    forecastStatus: 'Unknown',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: null,
    afterCleanUp: { ...base.growth.afterCleanUp, staysUnderEntitlement: null },
  },
  breakdown: {
    ...base.breakdown,
    segments: base.breakdown.segments.filter((segment) => segment.key !== 'free'),
  },
  oneDrive: {
    ...base.oneDrive,
    entitlementPerUserBytes: null,
    licenceEstimatePerUserBytes: null,
    entitlementUnknownReason: 'licencesUnavailable',
    overEntitlement: null,
  },
  archive: { ...base.archive, savingApplies: true, savingBytes: 120 * GB, annualSaving: 28.8 },
  caveats: { ...base.caveats, entitlementIsEstimated: false },
}

export const dailyRate: StorageOverview = {
  ...base,
  growth: {
    ...base.growth,
    windowMonths: 1,
    windowDays: 40,
    rateSource: 'daily',
  },
}

export const firstDay: StorageOverview = {
  ...base,
  growth: {
    ...base.growth,
    avgMonthlyGrowthBytes: 0,
    addedInWindowBytes: 0,
    windowMonths: 0,
    windowDays: 0,
    rateSource: 'none',
    forecastStatus: 'Unknown',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: null,
    forecastEndBytes: 500 * GB,
    afterCleanUp: { ...base.growth.afterCleanUp, endBytes: null, staysUnderEntitlement: null },
  },
  cost: { ...base.cost, applies: false, growthAnnual: 0, growthAnnualStatus: 'healthy', cumulativeYear3: 0 },
}

export const overEntitlement: StorageOverview = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    usedBytes: 1100 * GB,
    remainingBytes: 0,
    usedPercentage: 1.1,
    headroomRatio: 0,
    overageBytes: 100 * GB,
    exhausted: true,
    utilization: 'attention',
  },
  breakdown: {
    ...base.breakdown,
    segments: base.breakdown.segments.map((segment) =>
      segment.key === 'free' ? { ...segment, bytes: 0, share: 0 } : segment,
    ),
  },
  growth: {
    ...base.growth,
    forecastStatus: 'Critical',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: 0,
  },
  archive: { ...base.archive, savingApplies: true, savingBytes: 100 * GB, annualSaving: 24 },
}
