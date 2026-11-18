import { describe, expect, it } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { actionableCards, annualCost, deletedStorageCard } from './actionableCards'
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
  growth: { ...quiet.growth, forecastMonthsToExhaustion: months },
})

describe('actionableCards', () => {
  it('shows only the storage used for a tenant with nothing to act on', () => {
    expect(actionableCards(quiet)).toEqual(['storageUsed'])
  })

  it('shows every card a busy tenant can act on, in priority order', () => {
    expect(actionableCards(busy)).toEqual([
      'storageUsed',
      'overEntitlement',
      'costOfNothing',
      'archiveCandidates',
      'deletedButBilling',
    ])
  })

  it('shows the forecast only when exhaustion falls within 24 months and the entitlement is not exceeded yet', () => {
    expect(actionableCards(withMonths(24))).toContain('forecastExhaustion')
    expect(actionableCards(withMonths(25))).not.toContain('forecastExhaustion')
    expect(actionableCards(withMonths(null))).not.toContain('forecastExhaustion')
    expect(actionableCards(busy)).not.toContain('forecastExhaustion')
  })

  it('shows the cost of doing nothing only when three years of growth cost money', () => {
    expect(actionableCards({ ...quiet, cost: { ...quiet.cost, cumulativeYear3: 0.5 } })).toContain('costOfNothing')
    expect(
      actionableCards({ ...quiet, cost: { ...quiet.cost, applies: false, cumulativeYear3: 0.5 } }),
    ).not.toContain('costOfNothing')
  })

  it('shows archive candidates only when a site qualifies', () => {
    expect(actionableCards({ ...quiet, archive: { ...quiet.archive, siteCount: 1 } })).toContain('archiveCandidates')
    expect(
      actionableCards({ ...quiet, archive: { ...quiet.archive, applies: false, siteCount: 1 } }),
    ).not.toContain('archiveCandidates')
  })

  it('shows deleted storage whenever it holds bytes, billed or not', () => {
    const within: StorageOverview = {
      ...quiet,
      sharePoint: { ...quiet.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } },
    }
    expect(actionableCards(within)).toContain('deletedButBilling')
    expect(actionableCards(busy)).toContain('deletedButBilling')
    expect(actionableCards(quiet)).not.toContain('deletedButBilling')
  })
})

const withDeleted = (overview: StorageOverview, siteBytes: number, driveBytes = 0): StorageOverview => ({
  ...overview,
  sharePoint: { ...overview.sharePoint, deletedButBilling: { bytes: siteBytes, count: siteBytes > 0 ? 4 : 0 } },
  oneDrive: { ...overview.oneDrive, deletedButBilling: { bytes: driveBytes, count: driveBytes > 0 ? 2 : 0 } },
})

describe('deletedStorageCard', () => {
  it('bills deleted sites only up to the overage', () => {
    expect(deletedStorageCard(busy)).toEqual({
      bytes: 24 * GB,
      siteCount: 4,
      oneDriveCount: 0,
      billing: 'billed',
      billableBytes: 24 * GB,
      headroomBytes: 0,
    })
    expect(
      deletedStorageCard({ ...busy, sharePoint: { ...busy.sharePoint, overageBytes: 10 * GB } })?.billableBytes,
    ).toBe(10 * GB)
  })

  it('says a tenant under its entitlement is not billed, by how much it is under', () => {
    const card = deletedStorageCard(withDeleted(quiet, 24 * GB))
    expect(card?.billing).toBe('underEntitlement')
    expect(card?.headroomBytes).toBe(500 * GB)
    expect(card?.billableBytes).toBe(0)
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

  it('is absent while nothing deleted holds storage', () => {
    expect(deletedStorageCard(quiet)).toBeNull()
  })
})

describe('annualCost', () => {
  it('prices bytes per year at the monthly rate, to the cent', () => {
    expect(annualCost(10 * GB, 0.16)).toBe(19.2)
  })
})
