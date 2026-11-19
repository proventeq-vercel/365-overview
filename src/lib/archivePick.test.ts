import { describe, it, expect } from 'vitest'
import type { GrowthPoint, StorageRow } from '@/types/storage'
import { archivableSites, toggleId } from './archive'
import { costOverTime } from './cost'
import { GB_IN_BYTES } from './entitlement'
import { afterArchiveBytes, cleanUpOutlook, growthRows } from './forecast'

const GB = GB_IN_BYTES

const site = (id: string, usedGb: number, lastActivityDate: string | null, isDeleted = false): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: `https://contoso.sharepoint.com/sites/${id}`,
  ownerDisplayName: '',
  storageUsedBytes: usedGb * GB,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate,
  isDeleted,
})

const points: GrowthPoint[] = [
  { month: '2026-05', actualUsedBytes: 100 * GB, projectedUsedBytes: 100 * GB, afterCleanUpBytes: 90 * GB },
  { month: '2026-06', actualUsedBytes: null, projectedUsedBytes: 110 * GB, afterCleanUpBytes: 100 * GB },
  { month: '2026-07', actualUsedBytes: null, projectedUsedBytes: 120 * GB, afterCleanUpBytes: 110 * GB },
]

describe('archivableSites', () => {
  it('lists the live sites inactive before the cutoff, largest first', () => {
    const sites = [
      site('small', 1, '2020-01-01'),
      site('busy', 9, '2026-08-01'),
      site('big', 5, '2021-06-01'),
      site('gone', 7, '2019-01-01', true),
      site('unknown', 3, null),
    ]
    expect(archivableSites(sites, '2023-08-30').map((row) => row.id)).toEqual(['big', 'small'])
  })
})

describe('toggleId', () => {
  it('adds an id that is not there and removes one that is', () => {
    expect([...toggleId(new Set(['a']), 'b')]).toEqual(['a', 'b'])
    expect([...toggleId(new Set(['a', 'b']), 'a')]).toEqual(['b'])
  })
})

describe('afterArchiveBytes', () => {
  it('takes the picked sites off the line after clean-up, never below zero', () => {
    expect(afterArchiveBytes(points[1], 30 * GB)).toBe(70 * GB)
    expect(afterArchiveBytes(points[0], 200 * GB)).toBe(0)
  })

  it('starts from the forecast when there is no line after clean-up', () => {
    expect(afterArchiveBytes({ ...points[1], afterCleanUpBytes: null }, 30 * GB)).toBe(80 * GB)
    expect(
      afterArchiveBytes({ month: '2026-01', actualUsedBytes: 5, projectedUsedBytes: null, afterCleanUpBytes: null }, 1),
    ).toBeNull()
  })
})

describe('growthRows', () => {
  it('adds the archive line only when sites are picked', () => {
    expect(growthRows(points, 0)[1]).not.toHaveProperty('afterArchiveBytes')
    expect(growthRows(points, 10 * GB).map((row) => row.afterArchiveBytes)).toEqual([80 * GB, 90 * GB, 100 * GB])
  })
})

describe('cleanUpOutlook', () => {
  it('ends the forecast with the picked sites archived and says whether it stays under the entitlement', () => {
    expect(cleanUpOutlook(points, 20 * GB, 95 * GB)).toEqual({ endBytes: 90 * GB, staysUnderEntitlement: true })
    expect(cleanUpOutlook(points, 5 * GB, 95 * GB)).toEqual({ endBytes: 105 * GB, staysUnderEntitlement: false })
  })

  it('has nothing to say without forecast months', () => {
    expect(cleanUpOutlook(points.slice(0, 1), 5 * GB, 95 * GB)).toEqual({ endBytes: null, staysUnderEntitlement: null })
  })
})

describe('costOverTime', () => {
  it('prices every line above the entitlement when the forecast passes it', () => {
    const { basis, rows } = costOverTime(points, 105 * GB, 0.5, 10 * GB)
    expect(basis).toBe('billable')
    expect(rows).toEqual([
      { month: '2026-06', forecastCost: 2.5, afterCleanUpCost: 0, afterArchiveCost: 0 },
      { month: '2026-07', forecastCost: 7.5, afterCleanUpCost: 2.5, afterArchiveCost: 0 },
    ])
  })

  it('charts the list-price value of growth inside the entitlement', () => {
    const { basis, rows } = costOverTime(points, 500 * GB, 0.5, 10 * GB)
    expect(basis).toBe('withinEntitlement')
    expect(rows.map((row) => row.forecastCost)).toEqual([5, 10])
    expect(rows.every((row) => row.afterCleanUpCost === null && row.afterArchiveCost === null)).toBe(true)
  })

  it('charts the list-price value of growth when the entitlement is unknown', () => {
    expect(costOverTime(points, null, 0.5, 0).basis).toBe('notional')
  })
})
