import { describe, it, expect } from 'vitest'
import type { UsagePoint } from '@/types/reports'
import type { StorageRow } from '@/types/storage'
import { GB_IN_BYTES } from '@/lib/entitlement'
import { buildArchiveImpact } from './archiveImpact'
import { buildStorageOverview } from './storageOverview'
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

const monthly = (values: number[]): UsagePoint[] =>
  values.map((value, i) => ({ date: `2026-${String(i + 1).padStart(2, '0')}-28`, value }))

const overviewOf = (over: Partial<OverviewInputs> = {}) =>
  buildStorageOverview({
    sites: [
      site({ id: 'busy', storageUsedBytes: 700 * GB, lastActivityDate: '2026-08-20' }),
      site({ id: 'dormant', storageUsedBytes: 50 * GB, lastActivityDate: '2021-03-01' }),
      site({ id: 'quiet', storageUsedBytes: 20 * GB, lastActivityDate: '2022-01-01' }),
      site({ id: 'gone', storageUsedBytes: 30 * GB, isDeleted: true }),
    ],
    drives: [],
    sharePointTrend: monthly([750 * GB, 760 * GB, 770 * GB, 780 * GB, 790 * GB, 800 * GB]),
    oneDriveTrend: [],
    skus: [],
    reportRefreshDate: '2026-08-30',
    ratePerGb: 0.2,
    currency: 'GBP',
    entitlementOverrideBytes: 900 * GB,
    oneDriveEntitlementOverrideBytes: null,
    now: new Date('2026-09-02T00:00:00Z'),
    ...over,
  })

const ids = (...values: string[]) => new Set(values)

describe('buildArchiveImpact', () => {
  it('leaves the model as it is when no site is picked', () => {
    const overview = overviewOf()
    const impact = buildArchiveImpact(overview, ids())
    expect(impact.picked).toEqual([])
    expect(impact.archivedBytes).toBe(0)
    expect(impact.removableBytes).toBe(30 * GB)
    expect(impact.cleansUp).toBe(true)
    expect(impact.outlook).toEqual({
      endBytes: overview.growth.afterCleanUp.endBytes,
      staysUnderEntitlement: overview.growth.afterCleanUp.staysUnderEntitlement,
    })
    expect(impact.trendRows).toHaveLength(overview.growth.points.length)
    expect(impact.trendRows.every((row) => !('afterArchiveBytes' in row))).toBe(true)
    expect(impact.cost.rows.every((row) => row.afterArchiveCost === null)).toBe(true)
  })

  it('takes the picked sites off the forecast after clean-up, largest first', () => {
    const impact = buildArchiveImpact(overviewOf(), ids('quiet', 'dormant'))
    expect(impact.picked.map((row) => row.id)).toEqual(['dormant', 'quiet'])
    expect(impact.archivedBytes).toBe(70 * GB)
    expect(impact.removableBytes).toBe(100 * GB)
    expect(impact.trendRows.at(-1)?.afterArchiveBytes).toBe((830 - 70) * GB)
    expect(impact.outlook).toEqual({ endBytes: 760 * GB, staysUnderEntitlement: true })
  })

  it('says the pick no longer stays under the entitlement when it is too small', () => {
    const impact = buildArchiveImpact(overviewOf({ entitlementOverrideBytes: 800 * GB }), ids('quiet'))
    expect(impact.outlook).toEqual({ endBytes: 810 * GB, staysUnderEntitlement: false })
  })

  it('ignores an id that is not an archivable site', () => {
    const impact = buildArchiveImpact(overviewOf(), ids('busy', 'gone', 'ghost', 'dormant'))
    expect(impact.picked.map((row) => row.id)).toEqual(['dormant'])
    expect(impact.archivedBytes).toBe(50 * GB)
  })

  it('drops a pick that the inactivity window no longer lists', () => {
    const impact = buildArchiveImpact(overviewOf({ inactiveYears: 6 }), ids('dormant', 'quiet'))
    expect(impact.picked).toEqual([])
    expect(impact.archivedBytes).toBe(0)
  })

  it('follows a refreshed size of a picked site', () => {
    const impact = buildArchiveImpact(
      overviewOf({
        sites: [
          site({ id: 'busy', storageUsedBytes: 700 * GB, lastActivityDate: '2026-08-20' }),
          site({ id: 'dormant', storageUsedBytes: 80 * GB, lastActivityDate: '2021-03-01' }),
        ],
      }),
      ids('dormant'),
    )
    expect(impact.archivedBytes).toBe(80 * GB)
  })

  it('does not clean up when no deleted site is still billing', () => {
    const impact = buildArchiveImpact(
      overviewOf({
        sites: [
          site({ id: 'busy', storageUsedBytes: 700 * GB, lastActivityDate: '2026-08-20' }),
          site({ id: 'dormant', storageUsedBytes: 50 * GB, lastActivityDate: '2021-03-01' }),
        ],
      }),
      ids('dormant'),
    )
    expect(impact.cleansUp).toBe(false)
    expect(impact.removableBytes).toBe(50 * GB)
    expect(impact.trendRows.at(-1)?.afterArchiveBytes).toBe((860 - 50) * GB)
  })

  it('counts today after the pick, so a tenant just over the entitlement does not stay under it', () => {
    const impact = buildArchiveImpact(
      overviewOf({
        sites: [
          site({ id: 'busy', storageUsedBytes: 700 * GB, lastActivityDate: '2026-08-20' }),
          site({ id: 'dormant', storageUsedBytes: 1 * GB, lastActivityDate: '2021-03-01' }),
        ],
        sharePointTrend: monthly([755 * GB, 745 * GB, 735 * GB, 725 * GB, 715 * GB, 705 * GB]),
        entitlementOverrideBytes: 700 * GB,
      }),
      ids('dormant'),
    )
    expect(impact.outlook.staysUnderEntitlement).toBe(false)
  })
})
