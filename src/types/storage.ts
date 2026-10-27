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
  afterCleanUpBytes: number | null
}

export type ForecastStatus = 'Healthy' | 'Warning' | 'Critical' | 'Unknown'

export interface RetainedTotal {
  bytes: number
  count: number
}

export type GrowthRateSource = 'monthly' | 'daily' | 'none'

export interface CleanUpForecast {
  inactiveBytes: number
  deletedBytes: number
  removableBytes: number
  endBytes: number | null
  staysUnderEntitlement: boolean | null
}

export type OneDriveEntitlementUnknown = 'licencesUnavailable' | 'noSizedPlan'

export const INACTIVE_DRIVE_BANDS = ['firstYear', 'secondYear', 'older', 'never'] as const

export type InactiveDriveBand = (typeof INACTIVE_DRIVE_BANDS)[number]

export interface DriveGroup {
  count: number
  bytes: number
}

export interface InactiveDriveBandTotal extends DriveGroup {
  band: InactiveDriveBand
  fromYears: number | null
  toYears: number | null
}

export interface OneDriveAttention {
  inactiveYears: number
  inactiveSince: string
  inactive: DriveGroup & { bands: InactiveDriveBandTotal[] }
  unlicensed: (DriveGroup & { notListed: number }) | null
}

export interface OneDriveAllocation {
  allocatedBytes: number
  freeBytes: number
  usedShare: number
  freeShare: number
}

export interface OneDrivePool {
  usedBytes: number
  allocation: OneDriveAllocation | null
}

export const STORAGE_SEGMENTS = [
  'sharePoint',
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

export type GrowthRanking = 'growth' | 'shrink' | 'size'

export type SizeRankingReason =
  | 'growthFailed'
  | 'reportDateTooOld'
  | 'throttled'
  | 'refused'
  | 'noDailyReports'
  | 'notMeasured'
  | 'unchanged'

export type GrowthExplanation = 'growth' | 'shrink' | SizeRankingReason

export type MissingReports = 'throttled' | 'refused' | 'notReturned'

export interface StorageGrowth {
  ranking: GrowthRanking
  explanation: GrowthExplanation
  baselineDate: string | null
  sizesOn: string
  windowDays: number
  reportsRead: number
  reportsInWindow: number
  missingReports: MissingReports | null
  missingNote: MissingReports | null
  measuredRows: number
  leaders: Slice[]
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
    usedFromSiteReport: boolean
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
    usedFromAccountReport: boolean
    drives: StorageRow[]
    driveCount: number
    drivesNearCap: number
    deletedButBilling: RetainedTotal
    entitlementPerUserBytes: number | null
    licenceEstimatePerUserBytes: number | null
    entitlementPerUserIsSet: boolean
    entitlementUnknownReason: OneDriveEntitlementUnknown | null
    overEntitlement: OverEntitlement | null
    pool: OneDrivePool
    attention: OneDriveAttention
  }

  breakdown: StorageBreakdown

  offenders: {
    rows: StorageRow[]
    poolUsedBytes: Record<StoragePool, number>
    topSites: Slice[]
    topDrives: Slice[]
    retained: RetainedTotal
  }

  growth: {
    avgMonthlyGrowthBytes: number
    addedInWindowBytes: number
    windowMonths: number
    windowDays: number
    rateSource: GrowthRateSource
    seriesIsVolatile: boolean
    points: GrowthPoint[]
    forecastStatus: ForecastStatus
    forecastExhaustionDate: string | null
    forecastMonthsToExhaustion: number | null
    forecastEndBytes: number
    afterCleanUp: CleanUpForecast
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
    applies: boolean
    ratePerGb: number
    currency: string
    growthAnnual: number
    growthAnnualStatus: HealthStatus
    cumulativeYear3: number
  }

  caveats: {
    entitlementIsEstimated: boolean
    nameMask: NameMask | null
  }
}
