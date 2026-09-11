import { describe, it, expect } from 'vitest'
import type { LicenseSku, UsagePoint } from '@/types/reports'
import type { StorageRow } from '@/types/storage'
import { GB_IN_BYTES } from '@/lib/entitlement'
import { buildStorageOverview, classifyWorkload } from './storageOverview'
import type { OverviewInputs } from './storageOverview'

const GB = GB_IN_BYTES

const site = (over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'SharePoint',
  id: 's1',
  url: 'https://c.sharepoint.com/sites/a',
  ownerDisplayName: 'Owner',
  storageUsedBytes: 10 * GB,
  fileCount: 10,
  activeFileCount: 5,
  lastActivityDate: '2026-08-01',
  isDeleted: false,
  template: 'STS#3',
  ...over,
})

const drive = (over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'OneDrive',
  id: 'u1',
  url: 'https://c-my.sharepoint.com/personal/u1',
  ownerDisplayName: 'User',
  storageUsedBytes: 5 * GB,
  fileCount: 5,
  activeFileCount: 2,
  lastActivityDate: '2026-08-01',
  isDeleted: false,
  allocatedBytes: 1024 * GB,
  ...over,
})

const monthly = (values: number[]): UsagePoint[] =>
  values.map((value, i) => ({ date: `2026-${String(i + 1).padStart(2, '0')}-28`, value }))

const sku = (partNumber: string, enabled: number): LicenseSku => ({
  skuId: partNumber,
  skuPartNumber: partNumber,
  consumed: enabled,
  enabled,
  available: 0,
  servicePlans: ['SHAREPOINTENTERPRISE', 'SHAREPOINTWAC'],
})

const inputs = (over: Partial<OverviewInputs> = {}): OverviewInputs => ({
  sites: [site()],
  drives: [drive()],
  sharePointTrend: monthly([100 * GB, 110 * GB, 120 * GB, 130 * GB, 140 * GB, 150 * GB]),
  oneDriveTrend: monthly([50 * GB, 52 * GB, 54 * GB, 56 * GB, 58 * GB, 60 * GB]),
  skus: [sku('ENTERPRISEPACK', 100)],
  reportRefreshDate: '2026-08-30',
  ratePerGb: 0.2,
  currency: 'GBP',
  entitlementOverrideBytes: null,
  now: new Date('2026-09-02T00:00:00Z'),
  ...over,
})

const unknownEntitlement = (over: Partial<OverviewInputs> = {}): OverviewInputs =>
  inputs({ skus: [], forceUnknownEntitlement: true, ...over })

describe('classifyWorkload', () => {
  it('treats Teams channel and group sites as Teams, in the words Graph reports', () => {
    expect(classifyWorkload('Team Channel')).toBe('Teams')
    expect(classifyWorkload('Group')).toBe('Teams')
  })

  it('still recognises the internal template ids', () => {
    expect(classifyWorkload('TEAMCHANNEL#0')).toBe('Teams')
    expect(classifyWorkload('GROUP#0')).toBe('Teams')
  })

  it('keeps Team Sites and Site Page Publishing under SharePoint', () => {
    expect(classifyWorkload('Team Site')).toBe('SharePoint')
    expect(classifyWorkload('Site Page Publishing')).toBe('SharePoint')
  })

  it('treats everything else, including an unknown template, as SharePoint', () => {
    expect(classifyWorkload('STS#3')).toBe('SharePoint')
    expect(classifyWorkload(undefined)).toBe('SharePoint')
  })
})

describe('buildStorageOverview pools', () => {
  it('takes SharePoint used bytes from the trend, not the site sum', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.sharePoint.usedBytes).toBe(150 * GB)
  })

  it('keeps OneDrive out of every SharePoint figure', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.oneDrive.usedBytes).toBe(60 * GB)
    expect(overview.sharePoint.usedBytes).toBe(150 * GB)
    expect(overview.sharePoint.remainingBytes).toBe(
      overview.sharePoint.entitledBytes! - 150 * GB,
    )
  })

  it('measures headroom against SharePoint alone, so OneDrive cannot shrink it', () => {
    const withMoreOneDrive = buildStorageOverview(
      inputs({ oneDriveTrend: monthly([900 * GB, 5000 * GB]) }),
    )
    const baseline = buildStorageOverview(inputs())
    expect(withMoreOneDrive.sharePoint.remainingBytes).toBe(
      baseline.sharePoint.remainingBytes,
    )
    expect(withMoreOneDrive.sharePoint.usedPercentage).toBe(
      baseline.sharePoint.usedPercentage,
    )
  })

  it('reports the used percentage against the entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 300 * GB }))
    expect(overview.sharePoint.usedPercentage).toBeCloseTo(0.5, 10)
  })
})

describe('buildStorageOverview entitlement', () => {
  it('estimates the entitlement and flags it as estimated', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.sharePoint.entitledBytes).toBe((1024 + 1000) * GB)
    expect(overview.sharePoint.entitlementIsMeasured).toBe(false)
    expect(overview.caveats.entitlementIsEstimated).toBe(true)
  })

  it('uses the admin override and clears the estimate caveat', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 5000 * GB }))
    expect(overview.sharePoint.entitledBytes).toBe(5000 * GB)
    expect(overview.sharePoint.entitlementIsMeasured).toBe(true)
    expect(overview.caveats.entitlementIsEstimated).toBe(false)
  })

  it('still yields the 1 TiB base for a tenant with no licences at all', () => {
    expect(buildStorageOverview(inputs({ skus: [] })).sharePoint.entitledBytes).toBe(
      1024 * GB,
    )
  })

  it('yields nulls, never zeros, when the entitlement cannot be established', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.sharePoint.entitledBytes).toBeNull()
    expect(overview.sharePoint.remainingBytes).toBeNull()
    expect(overview.sharePoint.usedPercentage).toBeNull()
    expect(overview.sharePoint.headroomRatio).toBeNull()
    expect(overview.sharePoint.overageBytes).toBeNull()
    expect(overview.cost.growthBillableAnnual).toBeNull()
    expect(overview.cost.cumulativeBillableYear3).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
  })

  it('raises no estimated-entitlement caveat when there is no entitlement to caveat', () => {
    expect(buildStorageOverview(unknownEntitlement()).caveats.entitlementIsEstimated).toBe(
      false,
    )
  })

  it('always populates the notional cost figures, even without an entitlement', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.cost.growthNotionalAnnual).toBeGreaterThan(0)
    expect(overview.cost.cumulativeNotionalYear3).toBeGreaterThan(0)
  })
})

describe('buildStorageOverview composition', () => {
  it('counts deleted sites that are still consuming quota', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [site(), site({ id: 's2', isDeleted: true, storageUsedBytes: 7 * GB })],
      }),
    )
    expect(overview.sharePoint.deletedButBilling).toEqual({ bytes: 7 * GB, count: 1 })
  })

  it('counts deleted drives separately from deleted sites', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [drive(), drive({ id: 'd2', isDeleted: true, storageUsedBytes: 3 * GB })],
      }),
    )
    expect(overview.oneDrive.deletedButBilling).toEqual({ bytes: 3 * GB, count: 1 })
    expect(overview.sharePoint.deletedButBilling).toEqual({ bytes: 0, count: 0 })
  })

  it('counts drives at or above 90% of their own allocation', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [
          drive({ id: 'a', storageUsedBytes: 1000 * GB, allocatedBytes: 1024 * GB }),
          drive({ id: 'b', storageUsedBytes: 10 * GB, allocatedBytes: 1024 * GB }),
        ],
      }),
    )
    expect(overview.oneDrive.drivesNearCap).toBe(1)
  })

  it('counts a drive exactly at the 90% threshold', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [drive({ storageUsedBytes: 900 * GB, allocatedBytes: 1000 * GB })],
      }),
    )
    expect(overview.oneDrive.drivesNearCap).toBe(1)
  })

  it('never counts a drive with no allocation towards the near-cap figure', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [drive({ storageUsedBytes: 900 * GB, allocatedBytes: undefined })],
      }),
    )
    expect(overview.oneDrive.drivesNearCap).toBe(0)
  })

  it('never counts a drive whose allocation is reported as zero', () => {
    const overview = buildStorageOverview(
      inputs({ drives: [drive({ storageUsedBytes: 900 * GB, allocatedBytes: 0 })] }),
    )
    expect(overview.oneDrive.drivesNearCap).toBe(0)
  })

  it('splits the workload ring by template and excludes deleted sites', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [
          site({ id: 'a', template: 'TEAMCHANNEL#0', storageUsedBytes: 30 * GB }),
          site({ id: 'b', template: 'STS#3', storageUsedBytes: 20 * GB }),
          site({ id: 'c', template: 'STS#3', isDeleted: true, storageUsedBytes: 99 * GB }),
        ],
      }),
    )
    expect(overview.sharePoint.byWorkload.find((s) => s.name === 'Teams')?.value).toBe(30 * GB)
    expect(overview.sharePoint.byWorkload.find((s) => s.name === 'SharePoint')?.value).toBe(
      20 * GB,
    )
  })

  it('never puts OneDrive into the SharePoint workload slices', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.sharePoint.byWorkload.map((s) => s.name)).not.toContain('OneDrive')
  })

  it('groups the template ring by template, excluding deleted sites', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [
          site({ id: 'a', template: 'STS#3', storageUsedBytes: 30 * GB }),
          site({ id: 'b', template: 'STS#3', storageUsedBytes: 20 * GB }),
          site({ id: 'c', template: 'GROUP#0', storageUsedBytes: 10 * GB }),
          site({ id: 'd', template: 'STS#3', isDeleted: true, storageUsedBytes: 99 * GB }),
        ],
      }),
    )
    expect(overview.sharePoint.byTemplate).toEqual([
      { name: 'STS#3', value: 50 * GB },
      { name: 'GROUP#0', value: 10 * GB },
    ])
  })

  it('labels a site with no template rather than dropping it', () => {
    const overview = buildStorageOverview(
      inputs({ sites: [site({ template: undefined, storageUsedBytes: 4 * GB })] }),
    )
    expect(overview.sharePoint.byTemplate).toEqual([{ name: 'Unknown', value: 4 * GB }])
  })

  it('carries the report refresh date through untouched', () => {
    expect(buildStorageOverview(inputs()).reportRefreshDate).toBe('2026-08-30')
  })

  it('flags concealed names from the combined site and drive rows', () => {
    const concealed = Array.from({ length: 6 }, (_, i) =>
      site({ id: `c${i}`, url: '', ownerDisplayName: '2C4A3F1E9B7D5A6C8E0F1A2B3C4D5E6F' }),
    )
    expect(buildStorageOverview(inputs({ sites: concealed })).caveats.namesAreConcealed).toBe(
      true,
    )
    expect(buildStorageOverview(inputs()).caveats.namesAreConcealed).toBe(false)
  })
})

describe('buildStorageOverview growth and cost', () => {
  it('flags short history and refuses a forecast', () => {
    const overview = buildStorageOverview(
      inputs({ sharePointTrend: monthly([100 * GB, 110 * GB]) }),
    )
    expect(overview.caveats.historyTooShort).toBe(true)
    expect(overview.growth.windowMonths).toBe(2)
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
  })

  it('does not flag short history on a full six-month window', () => {
    expect(buildStorageOverview(inputs()).caveats.historyTooShort).toBe(false)
  })

  it('reports zero runway for a tenant already over its entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 10 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastStatus).toBe('Critical')
    expect(overview.sharePoint.overageBytes).toBe(140 * GB)
  })

  it('reports zero overage, not a negative one, inside the entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 1000 * GB }))
    expect(overview.sharePoint.overageBytes).toBe(0)
    expect(overview.sharePoint.headroomRatio).toBeCloseTo(0.85, 10)
  })

  it('clamps headroom at zero over the entitlement, never negative', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 10 * GB }))
    expect(overview.sharePoint.headroomRatio).toBe(0)
  })

  it('reports the measured growth rate and the window it was measured over', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.growth.avgMonthlyGrowthBytes).toBe(10 * GB)
    expect(overview.growth.windowMonths).toBe(6)
    expect(overview.growth.addedInWindowBytes).toBe(50 * GB)
  })

  it('gives a flat tenant no exhaustion date and no negative runway', () => {
    const flat = monthly([100 * GB, 100 * GB, 100 * GB, 100 * GB, 100 * GB, 100 * GB])
    const overview = buildStorageOverview(inputs({ sharePointTrend: flat }))
    expect(overview.growth.avgMonthlyGrowthBytes).toBe(0)
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Healthy')
  })

  it('gives a shrinking tenant no exhaustion and no cost', () => {
    const shrinking = monthly([200 * GB, 190 * GB, 180 * GB, 170 * GB, 160 * GB, 150 * GB])
    const overview = buildStorageOverview(inputs({ sharePointTrend: shrinking }))
    expect(overview.growth.avgMonthlyGrowthBytes).toBe(-10 * GB)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.cost.growthNotionalAnnual).toBe(0)
  })

  it('marks a volatile series without suppressing the rate', () => {
    const spiky = monthly([100 * GB, 105 * GB, 110 * GB, 115 * GB, 120 * GB, 900 * GB])
    const overview = buildStorageOverview(inputs({ sharePointTrend: spiky }))
    expect(overview.growth.seriesIsVolatile).toBe(true)
    expect(overview.growth.avgMonthlyGrowthBytes).toBe(5 * GB)
  })

  it('projects six months past the last measured month', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.growth.points).toHaveLength(12)
    expect(overview.growth.points.at(-1)?.month).toBe('2026-12')
    expect(overview.growth.points.at(-1)?.projectedUsedBytes).toBe(210 * GB)
    expect(overview.growth.forecastEndBytes).toBe(210 * GB)
  })

  it('bills the year-one growth that exceeds headroom', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 200 * GB }))
    const headroomGb = 50
    const growthGb = 120
    expect(overview.cost.growthBillableAnnual).toBeCloseTo(
      (growthGb - headroomGb) * 0.2 * 12,
      6,
    )
  })

  it('passes the rate and currency through untouched', () => {
    const overview = buildStorageOverview(inputs({ ratePerGb: 0.17, currency: 'EUR' }))
    expect(overview.cost.ratePerGb).toBe(0.17)
    expect(overview.cost.currency).toBe('EUR')
  })

  it('does not divide by zero on an empty tenant', () => {
    const overview = buildStorageOverview(
      inputs({ sites: [], drives: [], sharePointTrend: [], oneDriveTrend: [] }),
    )
    expect(overview.sharePoint.usedBytes).toBe(0)
    expect(overview.oneDrive.usedBytes).toBe(0)
    expect(overview.growth.points).toEqual([])
    expect(overview.growth.forecastEndBytes).toBe(0)
    expect(Number.isFinite(overview.cost.growthNotionalAnnual)).toBe(true)
    expect(overview.sharePoint.byWorkload).toEqual([])
    expect(overview.oneDrive.drivesNearCap).toBe(0)
  })
})
