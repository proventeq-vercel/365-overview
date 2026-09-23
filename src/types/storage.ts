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
}

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

export interface StorageOverview {
  reportRefreshDate: string

  sharePoint: {
    usedBytes: number
    entitledBytes: number | null
    remainingBytes: number | null
    usedPercentage: number | null
    headroomRatio: number | null
    overageBytes: number | null
    utilization: HealthStatus | null
    entitlementIsMeasured: boolean
    licenceEstimateBytes: number
    byWorkload: Slice[]
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
  }

  offenders: {
    rows: StorageRow[]
    totalUsedBytes: number
    topConsumers: Slice[]
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

  cost: {
    ratePerGb: number
    currency: string
    growthAnnual: number
    cumulativeYear3: number
  }

  caveats: {
    entitlementIsEstimated: boolean
    namesAreConcealed: boolean
    historyTooShort: boolean
  }
}
