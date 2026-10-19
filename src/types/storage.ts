import type { HealthStatus } from '@/lib/thresholds'

export type StoragePool = 'SharePoint' | 'OneDrive'

export interface StorageRow {
  pool: StoragePool
  id: string
  name?: string
  url: string
  ownerDisplayName: string
  storageUsedBytes: number
  fileCount: number
  activeFileCount: number
  lastActivityDate: string | null
  isDeleted: boolean
  template?: string
  allocatedBytes?: number
  overEntitlementBytes?: number
}

export type NameMask = 'hidden' | 'concealed'

export interface Slice {
  name: string
  value: number
}

export interface GrowthPoint {
  month: string
  actualUsedBytes: number | null
  projectedUsedBytes: number | null
}

export type ForecastStatus = 'Healthy' | 'Warning' | 'Critical' | 'Unknown'

export interface RetainedTotal {
  bytes: number
  count: number
}

export type OneDriveEntitlementUnknown = 'licencesUnavailable' | 'noSizedPlan'

export const STORAGE_SEGMENTS = [
  'sharePoint',
  'oneDrive',
  'teams',
  'deleted',
  'inactive',
  'versions',
  'free',
] as const

export type StorageSegmentKey = (typeof STORAGE_SEGMENTS)[number]

export interface StorageSegment {
  key: StorageSegmentKey
  bytes: number | null
  share: number
}

export interface StorageBreakdown {
  segments: StorageSegment[]
  totalBytes: number
  deletedCount: number
}

export interface StorageGrowth {
  baselineDate: string
  reportRefreshDate: string
  windowDays: number
  topGrowers: Slice[]
}

export interface OverEntitlement {
  drives: StorageRow[]
  count: number
  excessBytes: number
}

export interface StorageOverview {
  reportRefreshDate: string

  sharePoint: {
    usedBytes: number
    entitledBytes: number | null
    remainingBytes: number | null
    usedPercentage: number | null
    headroomRatio: number | null
    overageBytes: number | null
    exhausted: boolean
    utilization: HealthStatus | null
    entitlementIsMeasured: boolean
    licenceEstimateBytes: number | null
    byTemplate: Slice[]
    sites: StorageRow[]
    siteCount: number
    deletedButBilling: RetainedTotal
  }

  oneDrive: {
    usedBytes: number
    drives: StorageRow[]
    driveCount: number
    drivesNearCap: number
    deletedButBilling: RetainedTotal
    entitlementPerUserBytes: number | null
    licenceEstimatePerUserBytes: number | null
    entitlementPerUserIsSet: boolean
    entitlementUnknownReason: OneDriveEntitlementUnknown | null
    overEntitlement: OverEntitlement | null
  }

  breakdown: StorageBreakdown

  offenders: {
    rows: StorageRow[]
    totalUsedBytes: number
    topSites: Slice[]
    topDrives: Slice[]
    retained: RetainedTotal
  }

  growth: {
    avgMonthlyGrowthBytes: number
    addedInWindowBytes: number
    windowMonths: number
    seriesIsVolatile: boolean
    points: GrowthPoint[]
    forecastStatus: ForecastStatus
    forecastExhaustionDate: string | null
    forecastMonthsToExhaustion: number | null
    forecastEndBytes: number
  }

  archive: {
    inactiveYears: number
    inactiveSince: string
    siteCount: number
    bytes: number
    shareOfSharePoint: number
    status: HealthStatus
    savingApplies: boolean
    savingBytes: number
    annualSaving: number
  }

  cost: {
    ratePerGb: number
    currency: string
    growthAnnual: number
    growthAnnualStatus: HealthStatus
    cumulativeYear3: number
  }

  caveats: {
    entitlementIsEstimated: boolean
    nameMask: NameMask | null
    historyTooShort: boolean
  }
}
