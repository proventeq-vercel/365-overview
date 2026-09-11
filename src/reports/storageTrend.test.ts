import { describe, it, expect } from 'vitest'
import { parseStorageTrend } from './storageTrend'

describe('parseStorageTrend', () => {
  it('takes the All row as the tenant total instead of adding the per-type rows to it', () => {
    const rows = [
      { reportDate: '2026-09-08', siteType: 'OneDrive', storageUsedInBytes: 3746075681 },
      { reportDate: '2026-09-08', siteType: 'All', storageUsedInBytes: 3746075681 },
      { reportDate: '2026-09-07', siteType: 'All', storageUsedInBytes: 3700000000 },
      { reportDate: '2026-09-07', siteType: 'OneDrive', storageUsedInBytes: 3700000000 },
    ]
    expect(parseStorageTrend(rows)).toEqual([
      { date: '2026-09-07', value: 3700000000 },
      { date: '2026-09-08', value: 3746075681 },
    ])
  })

  it('sums the per-type rows only when a date has no All row', () => {
    const rows = [
      { reportDate: '2026-08-01', siteType: 'Group', storageUsedInBytes: '100' },
      { reportDate: '2026-08-01', siteType: 'Team Site', storageUsedInBytes: '50' },
    ]
    expect(parseStorageTrend(rows)).toEqual([{ date: '2026-08-01', value: 150 }])
  })

  it('reads string numerics and sorts oldest first', () => {
    const rows = [
      { reportDate: '2026-08-02', siteType: 'All', storageUsedInBytes: '300' },
      { reportDate: '2026-08-01', siteType: 'All', storageUsedInBytes: '100' },
    ]
    expect(parseStorageTrend(rows)).toEqual([
      { date: '2026-08-01', value: 100 },
      { date: '2026-08-02', value: 300 },
    ])
  })

  it('skips rows with no report date rather than bucketing them together', () => {
    const rows = [
      { reportDate: '2026-08-01', siteType: 'All', storageUsedInBytes: '100' },
      { siteType: 'All', storageUsedInBytes: '999' },
    ]
    expect(parseStorageTrend(rows)).toEqual([{ date: '2026-08-01', value: 100 }])
  })

  it('is empty for no rows', () => {
    expect(parseStorageTrend([])).toEqual([])
  })
})
