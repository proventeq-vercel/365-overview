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
  oneDriveEntitlementOverrideBytes: null,
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

  it('knows no entitlement when the licences could not be read, rather than assuming the 1 TiB base', () => {
    const overview = buildStorageOverview(inputs({ skus: null }))
    expect(overview.sharePoint.licenceEstimateBytes).toBeNull()
    expect(overview.sharePoint.entitledBytes).toBeNull()
    expect(overview.sharePoint.remainingBytes).toBeNull()
    expect(overview.growth.forecastStatus).toBe('Unknown')
  })

  it('takes an entered entitlement when the licences could not be read', () => {
    const overview = buildStorageOverview(inputs({ skus: null, entitlementOverrideBytes: 2000 * GB }))
    expect(overview.sharePoint.entitledBytes).toBe(2000 * GB)
    expect(overview.caveats.entitlementIsEstimated).toBe(false)
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

  it('prices all growth without an entitlement, since nothing says it fits', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.cost.growthAnnual).toBeGreaterThan(0)
    expect(overview.cost.cumulativeYear3).toBeGreaterThan(0)
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

  describe('OneDrives over their licensed storage', () => {
    const planSku = (plan: string, enabled: number): LicenseSku => ({
      ...sku(plan, enabled),
      servicePlans: [plan],
    })

    it('lists live drives holding more than the 5 TB an E3/E5 tenant licenses, largest first, with the excess', () => {
      const overview = buildStorageOverview(
        inputs({
          drives: [
            drive({ id: 'raised-inside-licence', storageUsedBytes: 4000 * GB, allocatedBytes: 5120 * GB }),
            drive({ id: 'small-over', storageUsedBytes: 5200 * GB, allocatedBytes: 25_600 * GB }),
            drive({ id: 'big-over', storageUsedBytes: 8000 * GB, allocatedBytes: 25_600 * GB }),
          ],
        }),
      )
      const { overEntitlement, entitlementPerUserBytes, licenceEstimatePerUserBytes } = overview.oneDrive
      expect(entitlementPerUserBytes).toBe(5120 * GB)
      expect(licenceEstimatePerUserBytes).toBe(5120 * GB)
      expect(overEntitlement?.count).toBe(2)
      expect(overEntitlement?.drives.map((row) => row.id)).toEqual(['big-over', 'small-over'])
      expect(overEntitlement?.drives.map((row) => row.overEntitlementBytes)).toEqual([2880 * GB, 80 * GB])
      expect(overEntitlement?.excessBytes).toBe(2960 * GB)
    })

    it('never flags a drive an admin raised above 1 TB on a tenant whose licences allow 5 TB', () => {
      const overview = buildStorageOverview(
        inputs({ drives: [drive({ storageUsedBytes: 1200 * GB, allocatedBytes: 5120 * GB })] }),
      )
      expect(overview.oneDrive.overEntitlement?.count).toBe(0)
    })

    it('draws the line at 1 TB on a Business-plan tenant', () => {
      const overview = buildStorageOverview(
        inputs({
          skus: [planSku('SHAREPOINTSTANDARD', 40)],
          drives: [drive({ storageUsedBytes: 1200 * GB, allocatedBytes: 1300 * GB })],
        }),
      )
      expect(overview.oneDrive.entitlementPerUserBytes).toBe(1024 * GB)
      expect(overview.oneDrive.overEntitlement?.drives[0].overEntitlementBytes).toBe(176 * GB)
    })

    it('does not count a drive holding exactly its licensed storage', () => {
      const overview = buildStorageOverview(
        inputs({ drives: [drive({ storageUsedBytes: 5120 * GB, allocatedBytes: 25_600 * GB })] }),
      )
      expect(overview.oneDrive.overEntitlement?.count).toBe(0)
      expect(overview.oneDrive.overEntitlement?.excessBytes).toBe(0)
    })

    it('leaves a deleted-but-retained drive to the retained total', () => {
      const overview = buildStorageOverview(
        inputs({ drives: [drive({ storageUsedBytes: 9000 * GB, isDeleted: true })] }),
      )
      expect(overview.oneDrive.overEntitlement?.count).toBe(0)
    })

    it('is unknown, not a guessed 1 TB, when the licences cannot be read', () => {
      const overview = buildStorageOverview(
        inputs({ skus: null, drives: [drive({ storageUsedBytes: 9000 * GB })] }),
      )
      expect(overview.oneDrive.entitlementPerUserBytes).toBeNull()
      expect(overview.oneDrive.licenceEstimatePerUserBytes).toBeNull()
      expect(overview.oneDrive.overEntitlement).toBeNull()
      expect(overview.oneDrive.entitlementUnknownReason).toBe('licencesUnavailable')
    })

    it('says no plan is sized, rather than that licences were unreadable, when they were read', () => {
      const overview = buildStorageOverview(
        inputs({ skus: [planSku('EXCHANGE_S_STANDARD', 40)], drives: [drive({ storageUsedBytes: 9000 * GB })] }),
      )
      expect(overview.oneDrive.overEntitlement).toBeNull()
      expect(overview.oneDrive.entitlementUnknownReason).toBe('noSizedPlan')
    })

    it('has no unknown reason and marks the figure as set when an override is in force', () => {
      const overview = buildStorageOverview(inputs({ skus: null, oneDriveEntitlementOverrideBytes: 2 * GB }))
      expect(overview.oneDrive.entitlementUnknownReason).toBeNull()
      expect(overview.oneDrive.entitlementPerUserIsSet).toBe(true)
      expect(buildStorageOverview(inputs()).oneDrive.entitlementPerUserIsSet).toBe(false)
    })

    it('measures against the per-user storage set in the report settings, even without licences', () => {
      const overview = buildStorageOverview(
        inputs({
          skus: null,
          oneDriveEntitlementOverrideBytes: 2 * GB,
          drives: [drive({ id: 'frontline', storageUsedBytes: 5 * GB })],
        }),
      )
      expect(overview.oneDrive.entitlementPerUserBytes).toBe(2 * GB)
      expect(overview.oneDrive.overEntitlement?.drives[0].overEntitlementBytes).toBe(3 * GB)
    })

    it('keeps reporting the licence estimate beside an override, for the settings hint', () => {
      const overview = buildStorageOverview(inputs({ oneDriveEntitlementOverrideBytes: 2 * GB }))
      expect(overview.oneDrive.entitlementPerUserBytes).toBe(2 * GB)
      expect(overview.oneDrive.licenceEstimatePerUserBytes).toBe(5120 * GB)
    })

    it('ignores a zero or negative setting and keeps the licence estimate', () => {
      for (const override of [0, -2 * GB]) {
        const overview = buildStorageOverview(
          inputs({
            oneDriveEntitlementOverrideBytes: override,
            drives: [drive({ storageUsedBytes: 5 * GB })],
          }),
        )
        expect(overview.oneDrive.entitlementPerUserBytes).toBe(5120 * GB)
        expect(overview.oneDrive.overEntitlement?.count).toBe(0)
      }
    })

    it('does not change the drive rows the rest of the report lists', () => {
      const overview = buildStorageOverview(inputs({ drives: [drive({ storageUsedBytes: 9000 * GB })] }))
      expect(overview.oneDrive.overEntitlement?.count).toBe(1)
      expect(overview.oneDrive.drives[0].overEntitlementBytes).toBeUndefined()
    })
  })

  describe('storage usage line', () => {
    const estate = (over: Partial<OverviewInputs> = {}) =>
      inputs({
        sites: [
          site({ id: 'team', template: 'TEAMCHANNEL#0', storageUsedBytes: 30 * GB }),
          site({ id: 'quiet-team', template: 'TEAMCHANNEL#0', storageUsedBytes: 15 * GB, lastActivityDate: '2020-01-01' }),
          site({ id: 'quiet-site', template: 'STS#3', storageUsedBytes: 25 * GB, lastActivityDate: '2021-01-01' }),
          site({ id: 'busy-site', template: 'STS#3', storageUsedBytes: 20 * GB }),
          site({ id: 'gone', template: 'STS#3', storageUsedBytes: 10 * GB, isDeleted: true }),
        ],
        drives: [drive(), drive({ id: 'left', storageUsedBytes: 4 * GB, isDeleted: true })],
        ...over,
      })
    const bytesOf = (overview: ReturnType<typeof buildStorageOverview>) =>
      Object.fromEntries(overview.breakdown.segments.map((segment) => [segment.key, segment.bytes]))

    it('splits every workload into parts that never overlap, in the order the line draws them', () => {
      const overview = buildStorageOverview(estate())
      expect(overview.breakdown.segments.map((segment) => segment.key)).toEqual([
        'sharePoint',
        'teams',
        'deleted',
        'inactive',
        'versions',
        'free',
      ])
      expect(bytesOf(overview)).toEqual({
        sharePoint: 70 * GB,
        teams: 30 * GB,
        deleted: 10 * GB,
        inactive: 40 * GB,
        versions: null,
        free: 1874 * GB,
      })
      expect(overview.breakdown.totalBytes).toBe(2024 * GB)
      expect(overview.breakdown.deletedCount).toBe(1)
    })

    it('measures OneDrive as its own pool: live drives’ storage against their own allocations, both from the account rows', () => {
      const { oneDrive } = buildStorageOverview(estate())
      expect(oneDrive.pool).toEqual({
        usedBytes: 5 * GB,
        allocation: { allocatedBytes: 1024 * GB, freeBytes: 1019 * GB, usedShare: 5 / 1024, freeShare: 1019 / 1024 },
      })
    })

    it('leaves the OneDrive allocation unknown, not partial, when a live drive reports none', () => {
      const { oneDrive } = buildStorageOverview(
        estate({ drives: [drive(), drive({ id: 'no-cap', allocatedBytes: 0 })] }),
      )
      expect(oneDrive.pool).toEqual({ usedBytes: 10 * GB, allocation: null })
    })

    it('keeps the OneDrive pool off the trend, so a missing OneDrive trend never reads as nothing used', () => {
      const { oneDrive } = buildStorageOverview(estate({ oneDriveTrend: [] }))
      expect(oneDrive.pool.usedBytes).toBe(5 * GB)
    })

    it('leaves the OneDrive allocation unknown when a drive carries no allocation field at all', () => {
      const { oneDrive } = buildStorageOverview(estate({ drives: [drive(), drive({ id: 'bare', allocatedBytes: undefined })] }))
      expect(oneDrive.pool.allocation).toBeNull()
    })

    it('has no OneDrive allocation, rather than a zero one, when there is no live drive', () => {
      const { oneDrive } = buildStorageOverview(estate({ drives: [] }))
      expect(oneDrive.pool.allocation).toBeNull()
    })

    it('never shows more than the whole allocation used', () => {
      const { oneDrive } = buildStorageOverview(estate({ drives: [drive({ storageUsedBytes: 20 * GB, allocatedBytes: 10 * GB })] }))
      expect(oneDrive.pool.allocation).toEqual({ allocatedBytes: 10 * GB, freeBytes: 0, usedShare: 1, freeShare: 0 })
    })

    it('gives each part its share of the line, and an unmeasured part none', () => {
      const { breakdown } = buildStorageOverview(estate())
      const share = Object.fromEntries(breakdown.segments.map((segment) => [segment.key, segment.share]))
      expect(share.teams).toBeCloseTo(30 / 2024, 10)
      expect(share.free).toBeCloseTo(1874 / 2024, 10)
      expect(share.versions).toBe(0)
    })

    it('has no free part, rather than a zero, when the entitlement is unknown', () => {
      const overview = buildStorageOverview(unknownEntitlement({ sites: estate().sites, drives: estate().drives }))
      expect(bytesOf(overview).free).toBeUndefined()
      expect(overview.breakdown.totalBytes).toBe(150 * GB)
    })

    it('leaves nothing free once SharePoint storage passes the entitlement', () => {
      const overview = buildStorageOverview(estate({ entitlementOverrideBytes: 100 * GB }))
      expect(bytesOf(overview).free).toBe(0)
      expect(overview.sharePoint.exhausted).toBe(true)
    })

    it('never draws a negative SharePoint part when the site rows add up to more than the trend', () => {
      const overview = buildStorageOverview(
        estate({ sharePointTrend: monthly([20 * GB, 30 * GB, 40 * GB, 50 * GB, 60 * GB, 70 * GB]) }),
      )
      expect(bytesOf(overview).sharePoint).toBe(0)
    })
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

  const concealedSites = Array.from({ length: 6 }, (_, i) =>
    site({
      id: `c${i}`,
      name: `Concealed ${i}`,
      url: `https://contoso.sharepoint.com/sites/concealed-${i}`,
      ownerDisplayName: '2C4A3F1E9B7D5A6C8E0F1A2B3C4D5E6F',
    }),
  )

  it('masks names as concealed from the combined site and drive rows', () => {
    expect(buildStorageOverview(inputs({ sites: concealedSites })).caveats.nameMask).toBe('concealed')
    expect(buildStorageOverview(inputs()).caveats.nameMask).toBeNull()
  })

  it('masks names as hidden when the session hides them', () => {
    expect(buildStorageOverview(inputs({ namesHidden: true })).caveats.nameMask).toBe('hidden')
  })

  it('calls a concealed tenant concealed even when the session also hides names', () => {
    expect(
      buildStorageOverview(inputs({ sites: concealedSites, namesHidden: true })).caveats.nameMask,
    ).toBe('concealed')
  })

  it('strips names, links and owners from the rows of a concealed tenant', () => {
    const overview = buildStorageOverview(inputs({ sites: concealedSites }))
    const [first] = overview.offenders.rows
    expect(first.name).toBeUndefined()
    expect(first.url).toBe('')
    expect(first.ownerDisplayName).toBe('2.')
    expect(first.id).toMatch(/^[0-9a-f]{16}$/)
    expect(overview.offenders.topSites.map((slice) => slice.name)).not.toContain('Concealed 0')
  })
})

describe('buildStorageOverview growth and cost', () => {
  it('forecasts from the daily series when there are fewer than six monthly points', () => {
    const overview = buildStorageOverview(
      inputs({
        sharePointTrend: [
          { date: '2026-07-31', value: 100 * GB },
          { date: '2026-08-10', value: 110 * GB },
          { date: '2026-08-30', value: 130 * GB },
        ],
        entitlementOverrideBytes: 1000 * GB,
      }),
    )
    expect(overview.growth.rateSource).toBe('daily')
    expect(overview.growth.windowDays).toBe(30)
    expect(overview.growth.avgMonthlyGrowthBytes).toBeCloseTo(30.4375 * GB, 0)
    expect(overview.growth.addedInWindowBytes).toBe(30 * GB)
    expect(overview.growth.forecastMonthsToExhaustion).toBe(28)
    expect(overview.growth.forecastExhaustionDate).toBe('2029-01-02')
    expect(overview.growth.forecastStatus).toBe('Warning')
    expect(overview.growth.points.at(-1)?.projectedUsedBytes).toBeCloseTo(312.625 * GB, 0)
  })

  it('counts what the daily series added from its first reported day, not from its first month end', () => {
    const overview = buildStorageOverview(
      inputs({
        sharePointTrend: [
          { date: '2026-07-20', value: 100 * GB },
          { date: '2026-07-31', value: 105 * GB },
          { date: '2026-08-30', value: 130 * GB },
        ],
      }),
    )
    expect(overview.growth.addedInWindowBytes).toBe(30 * GB)
    expect(overview.growth.windowDays).toBe(41)
  })

  it('judges unevenness on the monthly path only, not on a daily rate', () => {
    const overview = buildStorageOverview(
      inputs({ sharePointTrend: monthly([100 * GB, 105 * GB, 110 * GB, 115 * GB, 900 * GB]) }),
    )
    expect(overview.growth.rateSource).toBe('daily')
    expect(overview.growth.seriesIsVolatile).toBe(false)
  })

  it('counts what the monthly path added from month end to month end, not from the first reported day', () => {
    const overview = buildStorageOverview(
      inputs({
        sharePointTrend: [
          { date: '2026-01-10', value: 90 * GB },
          ...monthly([100 * GB, 110 * GB, 120 * GB, 130 * GB, 140 * GB, 150 * GB]),
        ],
      }),
    )
    expect(overview.growth.rateSource).toBe('monthly')
    expect(overview.growth.addedInWindowBytes).toBe(50 * GB)
  })

  it('takes the storage used from the usage report rows, and draws that one point, when the trend lists no day', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [site({ storageUsedBytes: 30 * GB }), site({ id: 's2', storageUsedBytes: 5 * GB, isDeleted: true })],
        drives: [drive({ storageUsedBytes: 7 * GB }), drive({ id: 'u2', storageUsedBytes: 3 * GB })],
        sharePointTrend: [],
        oneDriveTrend: [],
      }),
    )
    expect(overview.sharePoint.usedBytes).toBe(35 * GB)
    expect(overview.sharePoint.usedFromSiteReport).toBe(true)
    expect(overview.oneDrive.usedBytes).toBe(10 * GB)
    expect(overview.offenders.poolUsedBytes).toEqual({ SharePoint: 35 * GB, OneDrive: 10 * GB })
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.growth.points.map((point) => [point.month, point.actualUsedBytes])).toEqual([['2026-08', 35 * GB]])
  })

  it('has no rate, not a zero one, when the only other day in the trend is a zero-valued gap', () => {
    const overview = buildStorageOverview(
      inputs({ sharePointTrend: [{ date: '2026-08-29', value: 0 }, { date: '2026-08-30', value: 150 * GB }] }),
    )
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.cost.applies).toBe(false)
    expect(overview.sharePoint.usedBytes).toBe(150 * GB)
  })

  it('takes the used storage and the window from the reported days, skipping zero-valued gaps at either end', () => {
    const overview = buildStorageOverview(
      inputs({
        sharePointTrend: [
          { date: '2026-07-01', value: 0 },
          { date: '2026-08-20', value: 100 * GB },
          { date: '2026-08-29', value: 109 * GB },
          { date: '2026-08-30', value: 0 },
        ],
      }),
    )
    expect(overview.sharePoint.usedBytes).toBe(109 * GB)
    expect(overview.growth.windowDays).toBe(9)
    expect(overview.growth.addedInWindowBytes).toBe(9 * GB)
    expect(overview.growth.points[0].actualUsedBytes).toBe(109 * GB)
  })

  it('reads an all-zero trend as listing no day when the usage report rows hold storage', () => {
    const overview = buildStorageOverview(
      inputs({
        sites: [site({ storageUsedBytes: 40 * GB })],
        drives: [drive({ storageUsedBytes: 6 * GB })],
        sharePointTrend: monthly([0, 0, 0, 0, 0, 0]),
        oneDriveTrend: monthly([0, 0, 0, 0, 0, 0]),
      }),
    )
    expect(overview.sharePoint.usedBytes).toBe(40 * GB)
    expect(overview.sharePoint.usedFromSiteReport).toBe(true)
    expect(overview.oneDrive.usedBytes).toBe(6 * GB)
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.cost.applies).toBe(false)
  })

  it('keeps an all-zero trend for an empty tenant, whose rows hold nothing either', () => {
    const overview = buildStorageOverview(
      inputs({ sites: [site({ storageUsedBytes: 0 })], sharePointTrend: monthly([0, 0, 0, 0, 0, 0]) }),
    )
    expect(overview.sharePoint.usedFromSiteReport).toBe(false)
    expect(overview.growth.rateSource).toBe('monthly')
  })

  it('skips a zero-valued last day in the OneDrive trend too', () => {
    const overview = buildStorageOverview(
      inputs({ oneDriveTrend: [...monthly([50 * GB, 52 * GB, 54 * GB, 56 * GB, 58 * GB, 60 * GB]), { date: '2026-07-30', value: 0 }] }),
    )
    expect(overview.oneDrive.usedBytes).toBe(60 * GB)
    expect(overview.offenders.poolUsedBytes.OneDrive).toBe(60 * GB)
  })

  it('places the one point at the current month when the site report gives no report date', () => {
    const overview = buildStorageOverview(inputs({ sharePointTrend: [], reportRefreshDate: '' }))
    expect(overview.growth.points.map((point) => point.month)).toEqual(['2026-09'])
  })

  it('says OneDrive storage came from the account rows only when its trend lists no day', () => {
    expect(buildStorageOverview(inputs({ oneDriveTrend: [] })).oneDrive.usedFromAccountReport).toBe(true)
    expect(buildStorageOverview(inputs()).oneDrive.usedFromAccountReport).toBe(false)
  })

  it('reads the storage used from the trend, not the rows, whenever the trend has a day', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.sharePoint.usedBytes).toBe(150 * GB)
    expect(overview.sharePoint.usedFromSiteReport).toBe(false)
    expect(overview.oneDrive.usedBytes).toBe(60 * GB)
  })

  it('prices no growth from a single reported day, rather than a confident zero', () => {
    const single = buildStorageOverview(inputs({ sharePointTrend: [{ date: '2026-08-30', value: 150 * GB }] }))
    expect(single.cost.applies).toBe(false)
    expect(buildStorageOverview(inputs()).cost.applies).toBe(true)
  })

  it('measures by month, not by day, on a full six-month window', () => {
    const overview = buildStorageOverview(inputs())
    expect(overview.growth.rateSource).toBe('monthly')
    expect(overview.growth.windowDays).toBe(151)
  })

  it('has no rate and no forecast from a single day of history', () => {
    const overview = buildStorageOverview(
      inputs({ sharePointTrend: [{ date: '2026-08-30', value: 150 * GB }], entitlementOverrideBytes: 1000 * GB }),
    )
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.growth.avgMonthlyGrowthBytes).toBe(0)
    expect(overview.growth.forecastStatus).toBe('Unknown')
    expect(overview.growth.forecastMonthsToExhaustion).toBeNull()
    expect(overview.growth.points).toEqual([
      { month: '2026-08', actualUsedBytes: 150 * GB, projectedUsedBytes: 150 * GB, afterCleanUpBytes: 150 * GB },
    ])
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

  it('still calls an over-entitlement tenant exhausted when the history is a single day', () => {
    const overview = buildStorageOverview(
      inputs({ entitlementOverrideBytes: 10 * GB, sharePointTrend: [{ date: '2026-08-30', value: 150 * GB }] }),
    )
    expect(overview.growth.rateSource).toBe('none')
    expect(overview.growth.forecastStatus).toBe('Critical')
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBeNull()
  })

  it('keeps an exhaustion date for a tenant that runs out within the current month', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 155 * GB }))
    expect(overview.growth.forecastMonthsToExhaustion).toBe(0)
    expect(overview.growth.forecastExhaustionDate).toBe('2026-09-02')
    expect(overview.growth.forecastStatus).toBe('Critical')
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

  it('costs nothing while three years of growth stay inside the entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 1000 * GB }))
    expect(overview.cost.growthAnnual).toBe(0)
    expect(overview.cost.cumulativeYear3).toBe(0)
  })

  it('prices only the growth that overflows the entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 200 * GB }))
    expect(overview.cost.growthAnnual).toBeCloseTo(168, 6)
    expect(overview.cost.cumulativeYear3).toBeCloseTo(936, 6)
  })

  it('prices the whole growth of a tenant already over its entitlement', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 10 * GB }))
    expect(overview.cost.growthAnnual).toBeCloseTo(288, 6)
    expect(overview.cost.cumulativeYear3).toBeCloseTo(1296, 6)
  })

  it('grades a cost of nothing as healthy', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 1000 * GB }))
    expect(overview.cost.growthAnnualStatus).toBe('healthy')
  })

  it('grades a cost within a tenth of the entitlement bought again as one to watch', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 250 * GB }))
    expect(overview.cost.growthAnnual).toBeCloseTo(48, 6)
    expect(overview.cost.growthAnnualStatus).toBe('watch')
  })

  it('grades a cost beyond a tenth of the entitlement bought again as needing attention', () => {
    const overview = buildStorageOverview(inputs({ entitlementOverrideBytes: 200 * GB }))
    expect(overview.cost.growthAnnualStatus).toBe('attention')
  })

  it('grades a cost without an entitlement as one to watch, never as needing attention', () => {
    const overview = buildStorageOverview(unknownEntitlement())
    expect(overview.cost.growthAnnual).toBeCloseTo(288, 6)
    expect(overview.cost.growthAnnualStatus).toBe('watch')
  })

  it('passes the rate and currency through untouched', () => {
    const overview = buildStorageOverview(inputs({ ratePerGb: 0.17, currency: 'EUR' }))
    expect(overview.cost.ratePerGb).toBe(0.17)
    expect(overview.cost.currency).toBe('EUR')
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
    expect(offenders.topDrives[0]).toEqual({ name: 'd5', value: 600 * GB })
    expect(offenders.topDrives[4]).toEqual({ name: 'd1', value: 200 * GB })
  })

  it('totals each pool on its own, so a site is a share of SharePoint and a OneDrive of OneDrive', () => {
    const { offenders } = buildStorageOverview(
      inputs({
        sites: [site(), site({ id: 'gone', isDeleted: true, storageUsedBytes: 3 * GB })],
        drives: [drive(), drive({ id: 'left', isDeleted: true, storageUsedBytes: 2 * GB })],
      }),
    )
    expect(offenders.poolUsedBytes).toEqual({ SharePoint: 150 * GB, OneDrive: 60 * GB })
    expect(offenders.retained).toEqual({ bytes: 5 * GB, count: 2 })
  })

  it('does not divide by zero on an empty tenant', () => {
    const overview = buildStorageOverview(
      inputs({ sites: [], drives: [], sharePointTrend: [], oneDriveTrend: [] }),
    )
    expect(overview.archive.shareOfSharePoint).toBe(0)
    expect(overview.archive.status).toBe('healthy')
    expect(overview.sharePoint.usedBytes).toBe(0)
    expect(overview.oneDrive.usedBytes).toBe(0)
    expect(overview.growth.points).toEqual([
      { month: '2026-08', actualUsedBytes: 0, projectedUsedBytes: 0, afterCleanUpBytes: 0 },
    ])
    expect(overview.growth.forecastEndBytes).toBe(0)
    expect(Number.isFinite(overview.cost.growthAnnual)).toBe(true)
    expect(overview.breakdown.segments.every((segment) => Number.isFinite(segment.share))).toBe(true)
    expect(overview.oneDrive.drivesNearCap).toBe(0)
  })
})

describe('buildStorageOverview inactive sites', () => {
  const tenant = () =>
    inputs({
      sites: [
        site({ id: 'busy', storageUsedBytes: 60 * GB, lastActivityDate: '2026-08-20' }),
        site({ id: 'dormant', storageUsedBytes: 30 * GB, lastActivityDate: '2022-05-01' }),
        site({ id: 'quiet', storageUsedBytes: 10 * GB, lastActivityDate: '2021-01-15' }),
        site({ id: 'never', storageUsedBytes: 5 * GB, lastActivityDate: null }),
        site({ id: 'gone', storageUsedBytes: 40 * GB, lastActivityDate: '2019-01-01', isDeleted: true }),
      ],
      drives: [drive({ storageUsedBytes: 500 * GB, lastActivityDate: '2018-01-01' })],
    })

  it('counts live sites with no activity for three years before the report date by default', () => {
    const { archive } = buildStorageOverview(tenant())
    expect(archive.inactiveYears).toBe(3)
    expect(archive.inactiveSince).toBe('2023-08-30')
    expect(archive.siteCount).toBe(2)
    expect(archive.bytes).toBe(40 * GB)
  })

  it('measures the archivable share against live site storage, leaving OneDrive and deleted sites out', () => {
    const { archive } = buildStorageOverview(tenant())
    expect(archive.shareOfSharePoint).toBeCloseTo(40 / 105, 10)
    expect(archive.status).toBe('watch')
  })

  it('follows the inactivity window from the settings', () => {
    const { archive } = buildStorageOverview({ ...tenant(), inactiveYears: 5 })
    expect(archive.inactiveSince).toBe('2021-08-30')
    expect(archive.siteCount).toBe(1)
    expect(archive.bytes).toBe(10 * GB)
  })

  it('saves nothing, and says the saving does not apply, while storage is within the entitlement', () => {
    const { archive, sharePoint } = buildStorageOverview(tenant())
    expect(sharePoint.exhausted).toBe(false)
    expect(archive.savingApplies).toBe(false)
    expect(archive.savingBytes).toBe(0)
    expect(archive.annualSaving).toBe(0)
  })

  it('prices only the archivable storage over the entitlement once the tenant is past it', () => {
    const { archive } = buildStorageOverview({ ...tenant(), entitlementOverrideBytes: 120 * GB })
    expect(archive.savingApplies).toBe(true)
    expect(archive.savingBytes).toBe(30 * GB)
    expect(archive.annualSaving).toBeCloseTo(30 * 0.2 * 12, 6)
  })

  it('prices all the archivable storage when it is smaller than the overage', () => {
    const { archive } = buildStorageOverview({ ...tenant(), entitlementOverrideBytes: 100 * GB })
    expect(archive.savingBytes).toBe(40 * GB)
    expect(archive.annualSaving).toBeCloseTo(40 * 0.2 * 12, 6)
  })

  it('prices all the archivable storage when the entitlement is unknown', () => {
    const { archive } = buildStorageOverview({ ...tenant(), skus: [], forceUnknownEntitlement: true })
    expect(archive.savingApplies).toBe(true)
    expect(archive.savingBytes).toBe(40 * GB)
    expect(archive.annualSaving).toBeCloseTo(40 * 0.2 * 12, 6)
  })

  it('measures inactivity from today, instead of crashing, when the report carries no refresh date', () => {
    const { archive } = buildStorageOverview({ ...tenant(), reportRefreshDate: '' })
    expect(archive.inactiveSince).toBe('2023-09-02')
    expect(archive.siteCount).toBe(2)
  })

  it('builds the report for a tenant whose site report came back empty', () => {
    const overview = buildStorageOverview(inputs({ sites: [], drives: [], reportRefreshDate: '' }))
    expect(overview.archive.siteCount).toBe(0)
    expect(overview.archive.status).toBe('healthy')
  })

  it('needs attention once more than half of site storage is inactive', () => {
    const { archive } = buildStorageOverview({
      ...tenant(),
      inactiveYears: 1,
      reportRefreshDate: '2030-01-01',
    })
    expect(archive.siteCount).toBe(3)
    expect(archive.bytes).toBe(100 * GB)
    expect(archive.status).toBe('attention')
  })
})

describe('buildStorageOverview forecast after clean-up', () => {
  const tenant = (over: Partial<OverviewInputs> = {}) =>
    inputs({
      sites: [
        site({ id: 'busy', storageUsedBytes: 700 * GB, lastActivityDate: '2026-08-20' }),
        site({ id: 'dormant', storageUsedBytes: 50 * GB, lastActivityDate: '2021-03-01' }),
        site({ id: 'gone', storageUsedBytes: 30 * GB, isDeleted: true }),
      ],
      drives: [drive({ id: 'left', storageUsedBytes: 200 * GB, isDeleted: true })],
      sharePointTrend: monthly([750 * GB, 760 * GB, 770 * GB, 780 * GB, 790 * GB, 800 * GB]),
      entitlementOverrideBytes: 900 * GB,
      ...over,
    })

  it('counts inactive and deleted sites as removable, never the deleted OneDrives', () => {
    const { afterCleanUp } = buildStorageOverview(tenant()).growth
    expect(afterCleanUp.inactiveBytes).toBe(50 * GB)
    expect(afterCleanUp.deletedBytes).toBe(30 * GB)
    expect(afterCleanUp.removableBytes).toBe(80 * GB)
  })

  it('starts at used less removable today and grows at the forecast rate', () => {
    const { points, afterCleanUp } = buildStorageOverview(tenant()).growth
    expect(points.map((point) => point.afterCleanUpBytes)).toEqual([
      null,
      null,
      null,
      null,
      null,
      720 * GB,
      730 * GB,
      740 * GB,
      750 * GB,
      760 * GB,
      770 * GB,
      780 * GB,
    ])
    expect(afterCleanUp.endBytes).toBe(780 * GB)
  })

  it('follows the inactivity window from the settings', () => {
    const { afterCleanUp } = buildStorageOverview(tenant({ inactiveYears: 6 })).growth
    expect(afterCleanUp.inactiveBytes).toBe(0)
    expect(afterCleanUp.removableBytes).toBe(30 * GB)
    expect(afterCleanUp.endBytes).toBe(830 * GB)
  })

  it('stays under an entitlement the cleaned-up line never reaches', () => {
    expect(buildStorageOverview(tenant()).growth.afterCleanUp.staysUnderEntitlement).toBe(true)
  })

  it('does not stay under an entitlement the cleaned-up line crosses within the forecast', () => {
    const overview = buildStorageOverview(tenant({ entitlementOverrideBytes: 775 * GB }))
    expect(overview.growth.afterCleanUp.staysUnderEntitlement).toBe(false)
  })

  it('cannot say whether it stays under an unknown entitlement', () => {
    const overview = buildStorageOverview(
      tenant({ skus: [], forceUnknownEntitlement: true, entitlementOverrideBytes: null }),
    )
    expect(overview.growth.afterCleanUp.staysUnderEntitlement).toBeNull()
    expect(overview.growth.afterCleanUp.endBytes).toBe(780 * GB)
  })

  it('draws the line on the forecast itself when nothing is removable', () => {
    const overview = buildStorageOverview(
      tenant({
        sites: [site({ id: 'busy', storageUsedBytes: 800 * GB, lastActivityDate: '2026-08-20' })],
      }),
    )
    const { afterCleanUp, points } = overview.growth
    expect(afterCleanUp.removableBytes).toBe(0)
    expect(afterCleanUp.endBytes).toBe(860 * GB)
    expect(afterCleanUp.staysUnderEntitlement).toBe(true)
    expect(points.slice(5).map((point) => point.afterCleanUpBytes)).toEqual(
      points.slice(5).map((point) => point.projectedUsedBytes),
    )
  })

  it('forecasts after clean-up from the daily series on a short history', () => {
    const overview = buildStorageOverview(
      tenant({
        sharePointTrend: [
          { date: '2026-07-31', value: 790 * GB },
          { date: '2026-08-30', value: 800 * GB },
        ],
      }),
    )
    const { afterCleanUp, points } = overview.growth
    expect(afterCleanUp.removableBytes).toBe(80 * GB)
    expect(points.find((point) => point.month === '2026-08')?.afterCleanUpBytes).toBe(720 * GB)
    expect(afterCleanUp.endBytes).toBeCloseTo((720 + 6 * (10 * 30.4375) / 30) * GB, 0)
    expect(afterCleanUp.staysUnderEntitlement).toBe(true)
  })

  it('has no cleaned-up forecast from a single day, only what is removable today', () => {
    const overview = buildStorageOverview(tenant({ sharePointTrend: [{ date: '2026-08-30', value: 800 * GB }] }))
    const { afterCleanUp } = overview.growth
    expect(afterCleanUp.removableBytes).toBe(80 * GB)
    expect(afterCleanUp.endBytes).toBeNull()
    expect(afterCleanUp.staysUnderEntitlement).toBeNull()
  })
})
