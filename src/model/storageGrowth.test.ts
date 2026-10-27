import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { buildStorageGrowth, earliestRows, rankLeaders } from './storageGrowth'

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

const ranked = (current: StorageRow[], baseline: StorageRow[]) => {
  const { ranking, leaders } = rankLeaders(current, baseline)
  return { ranking, leaders: leaders.map(({ row: leader, valueBytes }) => [leader.pool, leader.id, valueBytes]) }
}

describe('rankLeaders', () => {
  it('ranks sites and OneDrives together by storage added, not by size', () => {
    const current = [row('SharePoint', 'huge', 900), row('SharePoint', 'quick', 300), row('OneDrive', 'dana', 200)]
    const baseline = [row('SharePoint', 'huge', 890), row('SharePoint', 'quick', 100), row('OneDrive', 'dana', 50)]
    expect(ranked(current, baseline)).toEqual({
      ranking: 'growth',
      leaders: [
        ['SharePoint', 'quick', 200],
        ['OneDrive', 'dana', 150],
        ['SharePoint', 'huge', 10],
      ],
    })
  })

  it('leaves out a row with no earlier size, since the dated report lists only the rows active that day', () => {
    const current = [row('SharePoint', 'measured', 60), row('SharePoint', 'unmeasured', 900)]
    expect(ranked(current, [row('SharePoint', 'measured', 20)]).leaders).toEqual([['SharePoint', 'measured', 40]])
  })

  it('leaves shrinking, unchanged and deleted rows out of the growth ranking', () => {
    const current = [
      row('SharePoint', 'grew', 25),
      row('SharePoint', 'shrank', 10),
      row('SharePoint', 'still', 20),
      row('SharePoint', 'gone', 99, { isDeleted: true }),
    ]
    const baseline = [
      row('SharePoint', 'grew', 20),
      row('SharePoint', 'shrank', 30),
      row('SharePoint', 'still', 20),
      row('SharePoint', 'gone', 1),
    ]
    expect(ranked(current, baseline)).toEqual({ ranking: 'growth', leaders: [['SharePoint', 'grew', 5]] })
  })

  it('ranks by storage freed when nothing grew but something shrank, leaving deleted rows out', () => {
    const current = [
      row('SharePoint', 'little', 90),
      row('OneDrive', 'lots', 10),
      row('SharePoint', 'still', 20),
      row('SharePoint', 'gone', 0, { isDeleted: true }),
    ]
    const baseline = [
      row('SharePoint', 'little', 100),
      row('OneDrive', 'lots', 70),
      row('SharePoint', 'still', 20),
      row('SharePoint', 'gone', 500),
    ]
    expect(ranked(current, baseline)).toEqual({
      ranking: 'shrink',
      leaders: [
        ['OneDrive', 'lots', 60],
        ['SharePoint', 'little', 10],
      ],
    })
  })

  it('ranks the live rows by storage used when nothing measured changed size', () => {
    const current = [
      row('SharePoint', 'small', 20),
      row('OneDrive', 'big', 700),
      row('SharePoint', 'gone', 9000, { isDeleted: true }),
    ]
    expect(ranked(current, [row('SharePoint', 'small', 20)])).toEqual({
      ranking: 'size',
      leaders: [
        ['OneDrive', 'big', 700],
        ['SharePoint', 'small', 20],
      ],
    })
  })

  it('ranks by storage used when no row has an earlier size at all', () => {
    expect(ranked([row('SharePoint', 'a', 5), row('SharePoint', 'b', 8)], []).ranking).toBe('size')
  })

  it('matches rows by pool and id, ignoring the case Graph returns the id in', () => {
    const current = [row('SharePoint', 'ABC', 50), row('OneDrive', 'abc', 70)]
    const baseline = [row('SharePoint', 'abc', 45), row('OneDrive', 'abc', 10)]
    expect(ranked(current, baseline).leaders).toEqual([
      ['OneDrive', 'abc', 60],
      ['SharePoint', 'ABC', 5],
    ])
  })

  it.each([
    ['growth', 1],
    ['shrink', -1],
    ['size', 0],
  ] as const)('keeps the ten leaders when ranking by %s', (ranking, step) => {
    const current = Array.from({ length: 14 }, (_, i) => row('SharePoint', `s${i}`, 100 + i))
    const baseline = current.map((site) => ({ ...site, storageUsedBytes: site.storageUsedBytes - step }))
    const result = rankLeaders(current, baseline)
    expect([result.ranking, result.leaders.length]).toEqual([ranking, 10])
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

const window = { baselineDate: '2026-09-30', reportRefreshDate: '2026-10-24', sizesOn: '2026-10-24', daysRead: 25, daysAsked: 25 }

describe('buildStorageGrowth', () => {
  it('names each grower like the table does and measures the window in days', () => {
    const growth = buildStorageGrowth({
      current: [row('SharePoint', 'id-1', 80, { name: 'Finance' }), row('SharePoint', 'id-2', 60, { url: 'https://c/sites/legal' })],
      baseline: [row('SharePoint', 'id-1', 20), row('SharePoint', 'id-2', 50)],
      baselineDate: '2026-08-02',
      reportRefreshDate: '2026-08-30',
      sizesOn: '2026-08-31',
      daysRead: 20,
      daysAsked: 25,
    })
    expect(growth).toEqual({
      ranking: 'growth',
      sizeRankingReason: null,
      baselineDate: '2026-08-02',
      reportRefreshDate: '2026-08-30',
      sizesOn: '2026-08-31',
      windowDays: 28,
      daysRead: 20,
      daysAsked: 25,
      measuredRows: 2,
      leaders: [
        { name: 'Finance', value: 60 },
        { name: 'legal', value: 10 },
      ],
    })
  })

  it('counts only the live rows that have an earlier size as measured', () => {
    const growth = buildStorageGrowth({
      ...window,
      current: [
        row('SharePoint', 'measured', 80),
        row('SharePoint', 'unmeasured', 90),
        row('SharePoint', 'gone', 70, { isDeleted: true }),
      ],
      baseline: [row('SharePoint', 'measured', 80), row('SharePoint', 'gone', 10)],
    })
    expect(growth.measuredRows).toBe(1)
  })

  it('says no daily report came back when it ranks by size without having read a day', () => {
    const growth = buildStorageGrowth({
      ...window,
      baselineDate: null,
      daysRead: 0,
      current: [row('SharePoint', 'a', 5)],
      baseline: [],
    })
    expect([growth.ranking, growth.sizeRankingReason, growth.windowDays]).toEqual(['size', 'noDailyReports', 0])
  })

  it('says no row was active in the daily reports when days came back but measured nothing', () => {
    const growth = buildStorageGrowth({ ...window, current: [row('SharePoint', 'a', 5)], baseline: [row('SharePoint', 'other', 3)] })
    expect([growth.ranking, growth.sizeRankingReason]).toEqual(['size', 'notMeasured'])
  })

  it('says nothing changed size when every measured row kept its size', () => {
    const growth = buildStorageGrowth({ ...window, current: [row('SharePoint', 'a', 5)], baseline: [row('SharePoint', 'a', 5)] })
    expect([growth.ranking, growth.sizeRankingReason]).toEqual(['size', 'unchanged'])
  })

  it('gives no size reason when it ranks by storage freed', () => {
    const growth = buildStorageGrowth({ ...window, current: [row('SharePoint', 'a', 5)], baseline: [row('SharePoint', 'a', 9)] })
    expect([growth.ranking, growth.sizeRankingReason, growth.leaders]).toEqual(['shrink', null, [{ name: 'a', value: 4 }]])
  })
})
