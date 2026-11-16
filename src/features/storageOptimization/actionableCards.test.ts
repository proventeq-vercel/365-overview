import { describe, expect, it } from 'vitest'
import type { StorageOverview } from '@/types/storage'
import { actionableCards, annualCost, deletedBillableBytes } from './actionableCards'
import { base, overEntitlement } from './testFixtures'

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

  it('shows deleted sites only while they bill above the entitlement', () => {
    const within: StorageOverview = {
      ...quiet,
      sharePoint: { ...quiet.sharePoint, deletedButBilling: { bytes: 24 * GB, count: 4 } },
    }
    expect(actionableCards(within)).not.toContain('deletedButBilling')
    expect(actionableCards(busy)).toContain('deletedButBilling')
  })
})

describe('deletedBillableBytes', () => {
  it('bills deleted storage only up to the overage', () => {
    expect(deletedBillableBytes(busy)).toBe(24 * GB)
    expect(
      deletedBillableBytes({ ...busy, sharePoint: { ...busy.sharePoint, overageBytes: 10 * GB } }),
    ).toBe(10 * GB)
  })
})

describe('annualCost', () => {
  it('prices bytes per year at the monthly rate, to the cent', () => {
    expect(annualCost(10 * GB, 0.16)).toBe(19.2)
  })
})
