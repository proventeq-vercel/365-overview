import type { StorageOverview } from '@/types/storage'

const GB = 1_073_741_824

export const base: StorageOverview = {
  reportRefreshDate: '2026-08-30',
  sharePoint: {
    usedBytes: 500 * GB,
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
  },
  breakdown: {
    segments: [
      { key: 'sharePoint', bytes: 200 * GB, share: 200 / 1120 },
      { key: 'oneDrive', bytes: 120 * GB, share: 120 / 1120 },
      { key: 'teams', bytes: 170 * GB, share: 170 / 1120 },
      { key: 'deleted', bytes: 10 * GB, share: 10 / 1120 },
      { key: 'inactive', bytes: 120 * GB, share: 120 / 1120 },
      { key: 'versions', bytes: null, share: 0 },
      { key: 'free', bytes: 500 * GB, share: 500 / 1120 },
    ],
    totalBytes: 1120 * GB,
    deletedCount: 4,
  },
  offenders: {
    rows: [],
    totalUsedBytes: 620 * GB,
    topConsumers: [],
    topSites: [],
    topDrives: [],
    retained: { bytes: 0, count: 0 },
  },
  growth: {
    avgMonthlyGrowthBytes: 10 * GB,
    addedInWindowBytes: 50 * GB,
    windowMonths: 5,
    seriesIsVolatile: false,
    points: [],
    forecastStatus: 'Healthy',
    forecastExhaustionDate: '2030-01-01',
    forecastMonthsToExhaustion: 50,
    forecastEndBytes: 560 * GB,
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
    ratePerGb: 0.02,
    currency: 'GBP',
    growthAnnual: 288,
    growthAnnualStatus: 'watch',
    cumulativeYear3: 1296,
  },
  caveats: {
    entitlementIsEstimated: true,
    nameMask: null,
    historyTooShort: false,
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
  },
  breakdown: {
    ...base.breakdown,
    segments: base.breakdown.segments.map((segment) =>
      segment.key === 'free' ? { ...segment, bytes: null, share: 0 } : segment,
    ),
  },
  archive: { ...base.archive, savingApplies: true, savingBytes: 120 * GB, annualSaving: 28.8 },
  caveats: { ...base.caveats, entitlementIsEstimated: false },
}

export const shortHistory: StorageOverview = {
  ...base,
  growth: {
    ...base.growth,
    windowMonths: 2,
    forecastStatus: 'Unknown',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: null,
  },
  caveats: { ...base.caveats, historyTooShort: true },
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
