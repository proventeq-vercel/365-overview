import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { betterGrowth, buildStorageGrowth, earliestRows, rankLeaders } from './storageGrowth'

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

  it('leaves rows holding nothing out of the size ranking, so it never draws a zero bar', () => {
    const current = [row('SharePoint', 'empty', 0), row('OneDrive', 'full', 30), row('SharePoint', 'blank', 0)]
    expect(ranked(current, [])).toEqual({ ranking: 'size', leaders: [['OneDrive', 'full', 30]] })
  })

  it('keeps the largest ones in order whatever order the rows come in', () => {
    const sizes = [7, 42, 3, 99, 15, 42, 1, 64, 8, 23, 77, 5, 31]
    const current = sizes.map((bytes, i) => row('SharePoint', `s${i}`, bytes))
    expect(rankLeaders(current, [], 4).leaders.map((leader) => [leader.row.id, leader.valueBytes])).toEqual([
      ['s3', 99],
      ['s10', 77],
      ['s7', 64],
      ['s1', 42],
    ])
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

const dates = ['2026-09-30', '2026-10-01', '2026-10-02']

const window = {
  baselineDate: '2026-09-30',
  sizesOn: '2026-10-24',
  dates,
  reportsRead: { sharePoint: 3, oneDrive: 3 },
  measurementFailed: false,
}

const one = [row('SharePoint', 'a', 5)]

describe('buildStorageGrowth', () => {
  it('names each grower like the table does and measures the window up to the day of the sizes', () => {
    const growth = buildStorageGrowth({
      current: [row('SharePoint', 'id-1', 80, { name: 'Finance' }), row('SharePoint', 'id-2', 60, { url: 'https://c/sites/legal' })],
      baseline: [row('SharePoint', 'id-1', 20), row('SharePoint', 'id-2', 50)],
      baselineDate: '2026-08-02',
      sizesOn: '2026-08-31',
      dates,
      reportsRead: { sharePoint: 2, oneDrive: 3 },
      measurementFailed: false,
    })
    expect(growth).toEqual({
      ranking: 'growth',
      explanation: 'growth',
      baselineDate: '2026-08-02',
      sizesOn: '2026-08-31',
      windowDays: 29,
      windowFrom: '2026-09-30',
      windowTo: '2026-10-02',
      daysInWindow: 3,
      reportsRead: { sharePoint: 2, oneDrive: 3 },
      reportsMissing: 1,
      complete: false,
      missingNote: true,
      measuredRows: 2,
      leaders: [
        { name: 'Finance', value: 60 },
        { name: 'legal', value: 10 },
      ],
    })
  })

  it.each([
    [{ sharePoint: 3, oneDrive: 3 }, false, 0, true, false],
    [{ sharePoint: 3, oneDrive: 0 }, false, 3, false, true],
    [{ sharePoint: 0, oneDrive: 0 }, false, 6, false, false],
    [{ sharePoint: 0, oneDrive: 0 }, true, 6, false, false],
  ] as const)('with %o read (failed: %s), %i are missing, complete %s, note %s', (reportsRead, measurementFailed, missing, complete, note) => {
    const growth = buildStorageGrowth({ ...window, reportsRead, measurementFailed, current: one, baseline: [] })
    expect([growth.reportsMissing, growth.complete, growth.missingNote]).toEqual([missing, complete, note])
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

  it('explains a size ranking that stands in for a failed measurement as such', () => {
    const growth = buildStorageGrowth({
      ...window,
      baselineDate: null,
      dates: [],
      reportsRead: { sharePoint: 0, oneDrive: 0 },
      measurementFailed: true,
      current: one,
      baseline: [],
    })
    expect([growth.ranking, growth.explanation, growth.complete]).toEqual(['size', 'growthFailed', false])
  })

  it('says the report is older than the daily reports go back when the window holds no day, and counts that as complete', () => {
    const growth = buildStorageGrowth({ ...window, baselineDate: null, dates: [], reportsRead: { sharePoint: 0, oneDrive: 0 }, current: one, baseline: [] })
    expect([growth.ranking, growth.explanation, growth.windowDays, growth.windowFrom, growth.complete]).toEqual([
      'size',
      'reportDateTooOld',
      0,
      null,
      true,
    ])
  })

  it('says no daily report came back when the window held days and none was read', () => {
    const growth = buildStorageGrowth({ ...window, baselineDate: null, reportsRead: { sharePoint: 0, oneDrive: 0 }, current: one, baseline: [] })
    expect([growth.ranking, growth.explanation, growth.windowDays]).toEqual(['size', 'noDailyReports', 0])
  })

  it('says no row was active in the daily reports when one pool came back but measured nothing', () => {
    const growth = buildStorageGrowth({ ...window, reportsRead: { sharePoint: 0, oneDrive: 1 }, current: one, baseline: [] })
    expect([growth.ranking, growth.explanation]).toEqual(['size', 'notMeasured'])
  })

  it('says nothing changed size when every measured row kept its size', () => {
    const growth = buildStorageGrowth({ ...window, current: one, baseline: [row('SharePoint', 'a', 5)] })
    expect([growth.ranking, growth.explanation]).toEqual(['size', 'unchanged'])
  })

  it('explains a ranking by storage freed as shrinking', () => {
    const growth = buildStorageGrowth({ ...window, current: one, baseline: [row('SharePoint', 'a', 9)] })
    expect([growth.ranking, growth.explanation, growth.leaders]).toEqual(['shrink', 'shrink', [{ name: 'a', value: 4 }]])
  })
})

describe('betterGrowth', () => {
  const read = (sharePoint: number, oneDrive: number, over: string[] = dates) =>
    buildStorageGrowth({ ...window, dates: over, reportsRead: { sharePoint, oneDrive }, current: one, baseline: [] })

  it('takes the new read when there is no earlier one', () => {
    const next = read(1, 1)
    expect(betterGrowth(undefined, next)).toBe(next)
  })

  it('keeps whichever read came back with more reports', () => {
    const fuller = read(3, 2)
    const thinner = read(1, 2)
    expect([betterGrowth(fuller, thinner), betterGrowth(thinner, fuller)]).toEqual([fuller, fuller])
  })

  it('keeps the earlier read when the window moved a day at midnight and the new one read fewer reports', () => {
    const earlier = read(3, 0)
    const afterMidnight = read(0, 0, ['2026-10-01', '2026-10-02'])
    const fullerAfterMidnight = read(2, 2, ['2026-10-01', '2026-10-02'])
    expect([betterGrowth(earlier, afterMidnight), betterGrowth(earlier, fullerAfterMidnight)]).toEqual([earlier, fullerAfterMidnight])
  })

  it('on a tie keeps the earlier read when the new one loses reports of a pool, and takes it otherwise', () => {
    const sharePointOnly = read(3, 0)
    const oneDriveOnly = read(0, 3)
    const same = read(3, 0)
    expect(betterGrowth(sharePointOnly, oneDriveOnly)).toBe(sharePointOnly)
    expect(betterGrowth(oneDriveOnly, sharePointOnly)).toBe(oneDriveOnly)
    expect(betterGrowth(sharePointOnly, same)).toBe(same)
  })
})
