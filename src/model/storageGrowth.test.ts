import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { buildStorageGrowth, earliestRows, growthLeaders } from './storageGrowth'

const row = (pool: StorageRow['pool'], id: string, bytes: number, over: Partial<StorageRow> = {}): StorageRow => ({
  pool,
  id,
  url: '',
  ownerDisplayName: 'An owner',
  storageUsedBytes: bytes,
  fileCount: 1,
  activeFileCount: 1,
  lastActivityDate: '2026-08-01',
  isDeleted: false,
  ...over,
})

describe('growthLeaders', () => {
  it('ranks sites and OneDrives together by storage added, not by size', () => {
    const current = [row('SharePoint', 'huge', 900), row('SharePoint', 'quick', 300), row('OneDrive', 'dana', 200)]
    const baseline = [row('SharePoint', 'huge', 890), row('SharePoint', 'quick', 100), row('OneDrive', 'dana', 50)]
    expect(growthLeaders(current, baseline).map(({ row: leader, growthBytes }) => [leader.id, growthBytes])).toEqual([
      ['quick', 200],
      ['dana', 150],
      ['huge', 10],
    ])
  })

  it('leaves out a row with no earlier size, since the dated report lists only the rows active that day', () => {
    const current = [row('SharePoint', 'measured', 60), row('SharePoint', 'unmeasured', 900)]
    expect(growthLeaders(current, [row('SharePoint', 'measured', 20)]).map(({ row: leader }) => leader.id)).toEqual([
      'measured',
    ])
  })

  it('leaves out shrinking, unchanged and deleted rows', () => {
    const current = [
      row('SharePoint', 'shrank', 10),
      row('SharePoint', 'still', 20),
      row('SharePoint', 'gone', 99, { isDeleted: true }),
    ]
    const baseline = [row('SharePoint', 'shrank', 30), row('SharePoint', 'still', 20), row('SharePoint', 'gone', 1)]
    expect(growthLeaders(current, baseline)).toEqual([])
  })

  it('matches rows by pool and id, ignoring the case Graph returns the id in', () => {
    const current = [row('SharePoint', 'ABC', 50), row('OneDrive', 'abc', 70)]
    const baseline = [row('SharePoint', 'abc', 45), row('OneDrive', 'abc', 10)]
    expect(growthLeaders(current, baseline).map(({ row: leader, growthBytes }) => [leader.pool, growthBytes])).toEqual([
      ['OneDrive', 60],
      ['SharePoint', 5],
    ])
  })

  it('keeps the ten fastest growers', () => {
    const current = Array.from({ length: 14 }, (_, i) => row('SharePoint', `s${i}`, 100 + i))
    const baseline = current.map((grown) => ({ ...grown, storageUsedBytes: 1 }))
    expect(growthLeaders(current, baseline)).toHaveLength(10)
  })
})

describe('earliestRows', () => {
  it('keeps each row as it was on the first day it appears', () => {
    const days = [
      [row('SharePoint', 'a', 10)],
      [row('SharePoint', 'A', 30), row('OneDrive', 'a', 5)],
      [row('OneDrive', 'a', 9), row('SharePoint', 'b', 70)],
    ]
    expect(earliestRows(days).map((first) => [first.pool, first.id, first.storageUsedBytes])).toEqual([
      ['SharePoint', 'a', 10],
      ['OneDrive', 'a', 5],
      ['SharePoint', 'b', 70],
    ])
  })
})

describe('buildStorageGrowth', () => {
  it('names each grower like the table does and measures the window in days', () => {
    const growth = buildStorageGrowth({
      current: [row('SharePoint', 'id-1', 80, { name: 'Finance' }), row('SharePoint', 'id-2', 60, { url: 'https://c/sites/legal' })],
      baseline: [row('SharePoint', 'id-1', 20), row('SharePoint', 'id-2', 50)],
      baselineDate: '2026-08-02',
      reportRefreshDate: '2026-08-30',
    })
    expect(growth).toEqual({
      baselineDate: '2026-08-02',
      reportRefreshDate: '2026-08-30',
      windowDays: 28,
      topGrowers: [
        { name: 'Finance', value: 60 },
        { name: 'legal', value: 10 },
      ],
    })
  })
})
