import type { StorageOverview } from '@/types/storage'

const GB = 1_073_741_824

export const base: StorageOverview = {
  reportRefreshDate: '2026-08-30',
  sharePoint: {
    usedBytes: 500 * GB,
    entitledBytes: 1000 * GB,
    remainingBytes: 500 * GB,
    usedPercentage: 0.5,
    entitlementIsMeasured: false,
    byWorkload: [],
    byTemplate: [],
    sites: [],
    deletedButBilling: { bytes: 0, count: 0 },
  },
  oneDrive: {
    usedBytes: 120 * GB,
    drives: [],
    drivesNearCap: 3,
    deletedButBilling: { bytes: 0, count: 0 },
  },
  growth: {
    avgMonthlyGrowthBytes: 10 * GB,
    windowMonths: 6,
    seriesIsVolatile: false,
    points: [],
    forecastStatus: 'Healthy',
    forecastExhaustionDate: '2030-01-01',
    forecastMonthsToExhaustion: 50,
    forecastEndBytes: 560 * GB,
  },
  cost: {
    ratePerGb: 0.2,
    currency: 'GBP',
    growthNotionalAnnual: 288,
    growthBillableAnnual: 0,
    cumulativeNotionalYear3: 1000,
    cumulativeBillableYear3: 0,
  },
  caveats: {
    entitlementIsEstimated: true,
    namesAreConcealed: false,
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
  },
  growth: {
    ...base.growth,
    forecastStatus: 'Unknown',
    forecastExhaustionDate: null,
    forecastMonthsToExhaustion: null,
  },
  cost: { ...base.cost, growthBillableAnnual: null, cumulativeBillableYear3: null },
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
