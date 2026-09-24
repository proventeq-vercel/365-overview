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
  inputs({ skus: null, ...over })

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

  it('keeps the licence estimate available while an override is in force', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 5000 * GB }))
    expect(overview.sharePoint.licenceEstimateBytes).toBe(
      buildStorageOverview(inputs()).sharePoint.entitledBytes,
    )
    expect(overview.sharePoint.licenceEstimateBytes).not.toBe(5000 * GB)
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
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
  })

  it('raises no estimated-entitlement caveat when there is no entitlement to caveat', () => {
    expect(buildStorageOverview(unknownEntitlement()).caveats.entitlementIsEstimated).toBe(
      false,
    )
  })

  it('has no billable cost without an entitlement, only the notional value of growth, as P365', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.cost.isBillable).toBe(false)
    expect(overview.cost.billableAnnual).toBeNull()
    expect(overview.cost.growthAnnual).toBeCloseTo(288)
    expect(overview.cost.cumulativeYear3).toBeCloseTo(1296)
  })

  it('has no licence estimate when the licences could not be read', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.sharePoint.licenceEstimateBytes).toBeNull()
  })

  it('still uses an entered entitlement when the licences could not be read', () => {
    const overview = buildStorageOverview(unknownEntitlement({ entitlementOverrideBytes: 5000 * GB }))
    expect(overview.sharePoint.entitledBytes).toBe(5000 * GB)
    expect(overview.sharePoint.remainingBytes).toBe(4850 * GB)
    expect(overview.caveats.entitlementIsEstimated).toBe(false)
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

  it('sizes the OneDrive workload slice from live drives, as the SharePoint slices are from live sites', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [drive(), drive({ id: 'd2', isDeleted: true, storageUsedBytes: 3 * GB })],
      }),
    )
    expect(overview.oneDrive.workloadBytes).toBe(5 * GB)
    expect(overview.oneDrive.usedBytes).toBe(60 * GB)
  })

  it('leaves the OneDrive workload slice unavailable when Microsoft 365 reports no OneDrive history', () => {
    const overview = buildStorageOverview(inputs({ oneDriveTrend: [] }))
    expect(overview.oneDrive.workloadBytes).toBeNull()
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

  it('counts live sites only, leaving deleted ones to the retained total', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [
          site({ id: 'a' }),
          site({ id: 'b' }),
          site({ id: 'c', isDeleted: true }),
        ],
      }),
    )
    expect(overview.sharePoint.siteCount).toBe(2)
    expect(overview.sharePoint.deletedButBilling.count).toBe(1)
  })

  it('counts live drives only, leaving deleted ones to the retained total', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [
          drive({ id: 'a' }),
          drive({ id: 'b' }),
          drive({ id: 'c', isDeleted: true }),
        ],
      }),
    )
    expect(overview.oneDrive.driveCount).toBe(2)
    expect(overview.oneDrive.deletedButBilling.count).toBe(1)
  })

  it('leaves a deleted-but-retained drive out of the near-cap count, as it is out of the drive count', () => {
    const overview = buildStorageOverview(
      inputs({
        drives: [drive({ id: 'gone', storageUsedBytes: 1000 * GB, allocatedBytes: 1024 * GB, isDeleted: true })],
      }),
    )
    expect(overview.oneDrive.driveCount).toBe(0)
    expect(overview.oneDrive.drivesNearCap).toBe(0)
    expect(overview.oneDrive.deletedButBilling.count).toBe(1)
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
    expect(overview.sharePoint.byTemplate).toEqual([{ name: '__unknown__', value: 4 * GB }])
  })

  it('folds the templates past the eighth into one slice the section names', () => {
    const sites = Array.from({ length: 9 }, (_, i) =>
      site({ id: `s${i}`, template: `T${i}`, storageUsedBytes: (10 - i) * GB }),
    )
    const overview = buildStorageOverview(inputs({ sites }))
    expect(overview.sharePoint.byTemplate).toHaveLength(9)
    expect(overview.sharePoint.byTemplate.at(-1)).toEqual({ name: '__other__', value: 2 * GB })
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
    expect(overview.growth.windowMonths).toBe(1)
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
  })

  it('does not flag short history on a full six-month window', () => {
    expect(buildStorageOverview(inputs()).caveats.historyTooShort).toBe(false)
  })

  it('reports zero runway and no exhaustion date for a tenant already over its entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 10 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Critical')
    expect(overview.sharePoint.overageBytes).toBe(140 * GB)
    expect(overview.sharePoint.remainingBytes).toBe(0)
  })

  it('treats exactly-at-entitlement as exhausted, not as a date within days', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 150 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
  })

  it('still calls an over-entitlement tenant exhausted when the history is too short', () => {
    const overview = buildStorageOverview(
      inputs({ entitlementOverrideBytes: 10 * GB, sharePointTrend: monthly([140 * GB, 150 * GB]) }),
    )
    expect(overview.caveats.historyTooShort).toBe(true)
    expect(overview.growth.forecastStatus).toBe('Critical')
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
  })

  it('grades a runway of exactly a year Critical, as P365 does', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 270 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(12)
    expect(overview.growth.forecastStatus).toBe('Critical')
  })

  it('grades the unrounded runway, so 36.5 months is Healthy though it shows as 36', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 515 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(36)
    expect(overview.growth.forecastStatus).toBe('Healthy')
  })

  it('keeps an exhaustion date for a tenant that runs out within the month, though it shows as 0 months', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 155 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBe('2026-09-17')
    expect(overview.growth.forecastStatus).toBe('Critical')
  })

  it('places the exhaustion date at the unrounded runway in 30.44-day months', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 270 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(12)
    expect(overview.growth.forecastExhaustionDate).toBe('2027-09-02')
  })

  it('drops the date past the ten-year horizon on the unrounded runway, keeping the rounded months', () => {
    const atHorizon = buildStorageOverview(inputs({ entitlementOverrideBytes: 1350 * GB }))
    expect(atHorizon.growth.forecastMonthsToExhaustion).toBe(120)
    expect(atHorizon.growth.forecastExhaustionDate).toBe('2036-09-01')
    const pastHorizon = buildStorageOverview(inputs({ entitlementOverrideBytes: 1355 * GB }))
    expect(pastHorizon.growth.forecastMonthsToExhaustion).toBe(120)
    expect(pastHorizon.growth.forecastExhaustionDate).toBeNull()
  })

  it('ignores a zero entitlement override instead of reporting an exceeded entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 0 }))
    const estimated = buildStorageOverview(inputs())
    expect(overview.sharePoint.entitledBytes).toBe(estimated.sharePoint.entitledBytes)
    expect(overview.sharePoint.entitlementIsMeasured).toBe(false)
    expect(overview.caveats.entitlementIsEstimated).toBe(true)
    expect(overview.growth.forecastMonthsToExhaustion).not.toBe(0)
  })

  it('grades utilisation against the entitlement, and not at all without one', () => {
    expect(buildStorageOverview(inputs({ entitlementOverrideBytes: 160 * GB })).sharePoint.utilization).toBe('watch')
    expect(buildStorageOverview(inputs({ entitlementOverrideBytes: 1000 * GB })).sharePoint.utilization).toBe('healthy')
    expect(buildStorageOverview(unknownEntitlement()).sharePoint.utilization).toBeNull()
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
    expect(overview.growth.windowMonths).toBe(5)
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
    expect(overview.cost.growthAnnual).toBe(0)
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

  it('bills only the growth that overflows the headroom, as P365 does', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 200 * GB }))
    expect(overview.cost.isBillable).toBe(true)
    expect(overview.cost.billableAnnual).toBeCloseTo(168, 6)
    expect(overview.cost.growthAnnual).toBeCloseTo(168, 6)
    expect(overview.cost.cumulativeYear3).toBeCloseTo(996, 6)
  })

  it('bills nothing for growth that fits inside the headroom', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 1000 * GB }))
    expect(overview.cost.billableAnnual).toBe(0)
    expect(overview.cost.cumulativeYear3).toBe(0)
  })

  it('bills the whole year of growth once the entitlement is exhausted', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 10 * GB }))
    expect(overview.cost.billableAnnual).toBeCloseTo(288, 6)
    expect(overview.cost.cumulativeYear3).toBeCloseTo(1296, 6)
  })

  it('passes the rate and currency through untouched', () => {
    const overview = buildStorageOverview(inputs({ ratePerGb: 0.17, currency: 'EUR' }))
    expect(overview.cost.ratePerGb).toBe(0.17)
    expect(overview.cost.currency).toBe('EUR')
  })

  it('ranks the ten biggest sites and drives together by storage, named by URL leaf or owner and id', () => {
    const sites = Array.from({ length: 12 }, (_, i) =>
      site({ id: `s${i}`, url: `https://c.sharepoint.com/sites/site-${i}`, storageUsedBytes: (i + 1) * GB }),
    )
    const drives = [drive({ url: '', ownerDisplayName: 'Dana Drive', storageUsedBytes: 100 * GB })]
    const { offenders } = buildStorageOverview(inputs({ sites, drives }))
    expect(offenders.rows).toHaveLength(13)
    expect(offenders.topConsumers).toHaveLength(10)
    expect(offenders.topConsumers[0]).toEqual({ name: 'Dana Drive · u1', value: 100 * GB })
    expect(offenders.topConsumers[1]).toEqual({ name: 'site-11', value: 12 * GB })
    expect(offenders.topConsumers[9]).toEqual({ name: 'site-3', value: 4 * GB })
  })

  it('ranks the five biggest sites and the five biggest drives separately', () => {
    const sites = Array.from({ length: 7 }, (_, i) =>
      site({ id: `s${i}`, url: `https://c.sharepoint.com/sites/site-${i}`, storageUsedBytes: (i + 1) * GB }),
    )
    const drives = Array.from({ length: 6 }, (_, i) =>
      drive({ id: `d${i}`, url: '', ownerDisplayName: `Owner ${i}`, storageUsedBytes: (i + 1) * 100 * GB }),
    )
    const { offenders } = buildStorageOverview(inputs({ sites, drives }))
    expect(offenders.topSites).toHaveLength(5)
    expect(offenders.topSites[0]).toEqual({ name: 'site-6', value: 7 * GB })
    expect(offenders.topSites[4]).toEqual({ name: 'site-2', value: 3 * GB })
    expect(offenders.topDrives).toHaveLength(5)
    expect(offenders.topDrives[0]).toEqual({ name: 'Owner 5 · d5', value: 600 * GB })
    expect(offenders.topDrives[4]).toEqual({ name: 'Owner 1 · d1', value: 200 * GB })
  })

  it('shares each offender row out of the rows the table lists, retained ones included, not the trend totals', () => {
    const { offenders } = buildStorageOverview(
      inputs({
        sites: [site(), site({ id: 'gone', isDeleted: true, storageUsedBytes: 3 * GB })],
        drives: [drive(), drive({ id: 'left', isDeleted: true, storageUsedBytes: 2 * GB })],
      }),
    )
    expect(offenders.tableTotalBytes).toBe(20 * GB)
    expect(offenders.retained).toEqual({ bytes: 5 * GB, count: 2 })
  })

  it('reports usage as unavailable, not zero, when Microsoft 365 returns no storage history', () => {
    const overview = buildStorageOverview(inputs({ sharePointTrend: [], oneDriveTrend: [] }))
    expect(overview.sharePoint.entitledBytes).toBe((1024 + 1000) * GB)
    expect(overview.sharePoint.usedBytes).toBeNull()
    expect(overview.sharePoint.remainingBytes).toBeNull()
    expect(overview.sharePoint.usedPercentage).toBeNull()
    expect(overview.sharePoint.headroomRatio).toBeNull()
    expect(overview.sharePoint.overageBytes).toBeNull()
    expect(overview.sharePoint.utilization).toBeNull()
    expect(overview.oneDrive.usedBytes).toBeNull()
    expect(overview.growth.forecastEndBytes).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
  })

  it('keeps the OneDrive figure when only the SharePoint history is missing', () => {
    const overview = buildStorageOverview(inputs({ sharePointTrend: [] }))
    expect(overview.sharePoint.usedBytes).toBeNull()
    expect(overview.oneDrive.usedBytes).toBe(60 * GB)
  })

  it('does not divide by zero on an empty tenant', () => {
    const overview = buildStorageOverview(
      inputs({ sites: [], drives: [], sharePointTrend: [], oneDriveTrend: [] }),
    )
    expect(overview.growth.points).toEqual([])
    expect(Number.isFinite(overview.cost.growthAnnual)).toBe(true)
    expect(overview.sharePoint.byWorkload).toEqual([])
    expect(overview.oneDrive.drivesNearCap).toBe(0)
  })
})
