import { describe, it, expect } from 'vitest'
import { parseStorageTrend } from './storageTrend'

describe('parseStorageTrend', () => {
  it('sums all site types per report date and sorts oldest first', () => {
    const rows = [
      { reportDate: '2026-08-02', siteType: 'All', storageUsedInBytes: '300' },
      { reportDate: '2026-08-01', siteType: 'All', storageUsedInBytes: '100' },
      { reportDate: '2026-08-01', siteType: 'Group', storageUsedInBytes: '50' },
    ]
    expect(parseStorageTrend(rows)).toEqual([
      { date: '2026-08-01', value: 150 },
      { date: '2026-08-02', value: 300 },
    ])
  })

  it('skips rows with no report date rather than bucketing them together', () => {
    const rows = [
      { reportDate: '2026-08-01', storageUsedInBytes: '100' },
      { siteType: 'All', storageUsedInBytes: '999' },
    ]
    expect(parseStorageTrend(rows)).toEqual([{ date: '2026-08-01', value: 100 }])
  })

  it('is empty for no rows', () => {
    expect(parseStorageTrend([])).toEqual([])
  })
})
