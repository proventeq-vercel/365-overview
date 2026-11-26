import { describe, expect, it } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { actionableCards, deletedStorageCard } from './actionableCards'
import { base, overEntitlement, unknownEntitlement } from './testFixtures'

const GB = 1_073_741_824

const quiet: StorageOverview = {
  ...base,
  growth: { ...base.growth, forecastExhaustionDate: null, forecastMonthsToExhaustion: null },
  archive: { ...base.archive, siteCount: 0, bytes: 0 },
  cost: { ...base.cost, cumulativeYear3: 0 },
}

const busy: StorageOverview = {
  ...overEntitlement,
  sharePoint: { ...overEntitlement.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } },
  cost: { ...overEntitlement.cost, applies: true, cumulativeYear3: 1296 },
}

const withMonths = (months: number | null): StorageOverview => ({
  ...quiet,
  growth: {
    ...quiet.growth,
    forecastMonthsToExhaustion: months,
    forecastExhaustionDate: months === null ? null : '2028-06-01',
  },
})

const ids = (overview: StorageOverview) => actionableCards(overview).map((card) => card.id)

describe('actionableCards', () => {
  it('shows only the storage used for a tenant with nothing to act on', () => {
    expect(ids(quiet)).toEqual(['storageUsed'])
  })

  it('shows every card a busy tenant can act on, in priority order', () => {
    expect(ids(busy)).toEqual([
      'storageUsed',
      'overEntitlement',
      'costOfNothing',
      'archiveCandidates',
      'deletedButBilling',
    ])
  })

  it('shows the over-entitlement card only while storage is over, with its yearly cost', () => {
    expect(actionableCards(busy)).toContainEqual({ id: 'overEntitlement', overageBytes: 100 * GB, annualCost: 24 })
    expect(ids(quiet)).not.toContain('overEntitlement')
    expect(ids(unknownEntitlement)).not.toContain('overEntitlement')
  })

  it('shows the forecast only when exhaustion falls within 24 months and the entitlement is not reached yet', () => {
    expect(actionableCards(withMonths(24))).toContainEqual({ id: 'forecastExhaustion', exhaustionDate: '2028-06-01' })
    expect(ids(withMonths(25))).not.toContain('forecastExhaustion')
    expect(ids(withMonths(null))).not.toContain('forecastExhaustion')
    expect(ids(busy)).not.toContain('forecastExhaustion')
  })

  it('leaves the forecast out for a tenant exactly at its entitlement', () => {
    const atEntitlement: StorageOverview = {
      ...withMonths(0),
      sharePoint: { ...quiet.sharePoint, remainingBytes: 0, overageBytes: 0, exhausted: true },
      growth: { ...quiet.growth, forecastMonthsToExhaustion: 0, forecastExhaustionDate: null },
    }
    expect(ids(atEntitlement)).toEqual(['storageUsed'])
  })

  it('shows the cost of doing nothing only when three years of growth cost money', () => {
    expect(ids({ ...quiet, cost: { ...quiet.cost, cumulativeYear3: 0.5 } })).toContain('costOfNothing')
    expect(ids({ ...quiet, cost: { ...quiet.cost, applies: false, cumulativeYear3: 0.5 } })).not.toContain(
      'costOfNothing',
    )
  })

  it('shows archive candidates only when a site qualifies and holds storage', () => {
    expect(ids({ ...quiet, archive: { ...quiet.archive, siteCount: 1, bytes: GB } })).toContain('archiveCandidates')
    expect(ids({ ...quiet, archive: { ...quiet.archive, applies: false, siteCount: 1, bytes: GB } })).not.toContain(
      'archiveCandidates',
    )
    expect(ids({ ...quiet, archive: { ...quiet.archive, siteCount: 3, bytes: 0 } })).not.toContain(
      'archiveCandidates',
    )
  })

  it('shows deleted storage whenever it holds bytes, billed or not', () => {
    const within: StorageOverview = {
      ...quiet,
      sharePoint: { ...quiet.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } },
    }
    expect(ids(within)).toContain('deletedButBilling')
    expect(ids(busy)).toContain('deletedButBilling')
    expect(ids(quiet)).not.toContain('deletedButBilling')
  })
})

const withDeleted = (overview: StorageOverview, siteBytes: number, driveBytes = 0): StorageOverview => ({
  ...overview,
  sharePoint: { ...overview.sharePoint, deletedButBilling: { bytes: siteBytes, count: siteBytes > 0 ? 4 : 0 } },
  oneDrive: { ...overview.oneDrive, deletedButBilling: { bytes: driveBytes, count: driveBytes > 0 ? 2 : 0 } },
})

describe('deletedStorageCard', () => {
  it('bills deleted sites only up to the overage, with the yearly cost of what is billed', () => {
    expect(deletedStorageCard(busy)).toEqual({
      bytes: 24 * GB,
      siteCount: 4,
      oneDriveCount: 0,
      billing: 'billed',
      billableBytes: 24 * GB,
      billableAnnualCost: 5.76,
      headroomBytes: 0,
    })
    const card = deletedStorageCard({ ...busy, sharePoint: { ...busy.sharePoint, overageBytes: 10 * GB } })
    expect(card?.billableBytes).toBe(10 * GB)
    expect(card?.billableAnnualCost).toBeCloseTo(2.4, 10)
  })

  it('says a tenant under its entitlement is not billed, by how much it is under', () => {
    const card = deletedStorageCard(withDeleted(quiet, 24 * GB))
    expect(card?.billing).toBe('underEntitlement')
    expect(card?.headroomBytes).toBe(500 * GB)
    expect(card?.billableBytes).toBe(0)
    expect(card?.billableAnnualCost).toBe(0)
  })

  it('says a tenant exactly at its entitlement is not billed yet', () => {
    const at = { ...quiet, sharePoint: { ...quiet.sharePoint, remainingBytes: 0, overageBytes: 0 } }
    expect(deletedStorageCard(withDeleted(at, 24 * GB))?.billing).toBe('atEntitlement')
  })

  it('says nothing about billing while the entitlement is unknown', () => {
    expect(deletedStorageCard(withDeleted(unknownEntitlement, 24 * GB))?.billing).toBe('entitlementUnknown')
  })

  it('keeps deleted OneDrives outside the SharePoint entitlement', () => {
    const card = deletedStorageCard(withDeleted(busy, 0, 6 * GB))
    expect(card?.billing).toBe('outsidePool')
    expect(card?.bytes).toBe(6 * GB)
    expect(card?.billableBytes).toBe(0)
    expect(deletedStorageCard(withDeleted(quiet, 24 * GB, 6 * GB))?.bytes).toBe(30 * GB)
  })

  it('counts only the deleted rows of a pool that still holds storage', () => {
    const emptySites: StorageOverview = {
      ...withDeleted(quiet, 0, 6 * GB),
      sharePoint: { ...quiet.sharePoint, deletedButBilling: { bytes: 0, count: 3 } },
    }
    const card = deletedStorageCard(emptySites)
    expect(card?.siteCount).toBe(0)
    expect(card?.oneDriveCount).toBe(2)
    const emptyDrives: StorageOverview = {
      ...withDeleted(quiet, 24 * GB),
      oneDrive: { ...quiet.oneDrive, deletedButBilling: { bytes: 0, count: 2 } },
    }
    expect(deletedStorageCard(emptyDrives)?.oneDriveCount).toBe(0)
  })

  it('is left out when either usage report did not come back, since it adds the two', () => {
    const deleted = withDeleted(quiet, 24 * GB, 6 * GB)
    expect(deletedStorageCard({ ...deleted, oneDrive: { ...deleted.oneDrive, accountReportRead: false } })).toBeNull()
    expect(deletedStorageCard({ ...deleted, sharePoint: { ...deleted.sharePoint, siteReportRead: false } })).toBeNull()
  })

  it('is absent while nothing deleted holds storage', () => {
    expect(deletedStorageCard(quiet)).toBeNull()
  })
})
