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
    utilization: 'healthy',
    entitlementIsMeasured: false,
    licenceEstimateBytes: 1000 * GB,
    byWorkload: [],
    byTemplate: [],
    sites: [],
    siteCount: 1089,
    deletedButBilling: { bytes: 0, count: 0 },
  },
  oneDrive: {
    usedBytes: 120 * GB,
    workloadBytes: 110 * GB,
    drives: [],
    driveCount: 40,
    drivesNearCap: 3,
    deletedButBilling: { bytes: 0, count: 0 },
  },
  offenders: {
    rows: [],
    tableTotalBytes: 620 * GB,
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
  cost: {
    ratePerGb: 0.16,
    currency: 'GBP',
    isBillable: true,
    billableAnnual: 0,
    growthAnnual: 0,
    cumulativeYear3: 0,
  },
  caveats: {
    entitlementIsEstimated: true,
    namesAreConcealed: false,
    historyTooShort: false,
  },
}

const notionalCost: StorageOverview['cost'] = {
  ...base.cost,
  isBillable: false,
  billableAnnual: null,
  growthAnnual: 230.4,
  cumulativeYear3: 1036.8,
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
  cost: notionalCost,
  caveats: { ...base.caveats, entitlementIsEstimated: false },
}

export const usageUnreported: StorageOverview = {
  ...base,
  sharePoint: {
    ...base.sharePoint,
    usedBytes: null,
    remainingBytes: null,
    usedPercentage: null,
    headroomRatio: null,
    overageBytes: null,
    utilization: null,
  },
  oneDrive: { ...base.oneDrive, usedBytes: null, workloadBytes: null },
  growth: {
    ...base.growth,
    windowMonths: 0,
    forecastStatus: 'Unknown',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: null,
    forecastEndBytes: null,
  },
  cost: notionalCost,
  caveats: { ...base.caveats, historyTooShort: true },
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
