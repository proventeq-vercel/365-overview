import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { storageUsage, type StorageUsageInputs } from './storageUsage'

const GB = 1_073_741_824

const storageRow = (overrides: Partial<StorageRow>): StorageRow => ({
  pool: 'SharePoint',
  id: 'id',
  url: '',
  ownerDisplayName: '',
  storageUsedBytes: 0,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...overrides,
})

const sites = [
  storageRow({ id: 'team-site', template: 'STS#3', storageUsedBytes: 300 * GB }),
  storageRow({ id: 'channel', template: 'TEAMCHANNEL#0', storageUsedBytes: 100 * GB }),
  storageRow({ id: 'group', template: 'GROUP#0', storageUsedBytes: 50 * GB }),
  storageRow({ id: 'deleted-site', template: 'STS#3', storageUsedBytes: 40 * GB, isDeleted: true }),
  storageRow({ id: 'deleted-team', template: 'GROUP#0', storageUsedBytes: 30 * GB, isDeleted: true }),
]

const drives = [
  storageRow({ pool: 'OneDrive', id: 'ada', storageUsedBytes: 30 * GB }),
  storageRow({ pool: 'OneDrive', id: 'bob', storageUsedBytes: 20 * GB }),
  storageRow({ pool: 'OneDrive', id: 'gone', storageUsedBytes: 99 * GB, isDeleted: true }),
]

const inputs = (overrides: Partial<StorageUsageInputs> = {}): StorageUsageInputs => ({
  siteReportRead: true,
  sites,
  sharePointUsedBytes: 520 * GB,
  accountReportRead: true,
  drives,
  oneDriveUsedBytes: 70 * GB,
  ...overrides,
})

describe('storageUsage', () => {
  it('splits live storage into SharePoint, Teams and OneDrive, leaving deleted sites and OneDrives out', () => {
    expect(storageUsage(inputs())).toEqual({
      rows: [
        { workload: 'sharePoint', bytes: 300 * GB, share: 0.6, scale: 1, source: 'siteReport' },
        { workload: 'teams', bytes: 150 * GB, share: 0.3, scale: 0.5, source: 'siteReport' },
        { workload: 'oneDrive', bytes: 50 * GB, share: 0.1, scale: 50 / 300, source: 'accountReport' },
      ],
      totalBytes: 500 * GB,
    })
  })

  it('puts the whole SharePoint trend figure on one SharePoint row when the site report did not come back', () => {
    const { rows } = storageUsage(inputs({ siteReportRead: false, sharePointUsedBytes: 520 * GB }))
    expect(rows.map(({ workload, bytes, source }) => [workload, bytes, source])).toEqual([
      ['sharePoint', 520 * GB, 'sharePointTrend'],
      ['oneDrive', 50 * GB, 'accountReport'],
    ])
  })

  it('takes OneDrive from the storage trend when the account report did not come back', () => {
    const { rows } = storageUsage(inputs({ accountReportRead: false, oneDriveUsedBytes: 70 * GB }))
    expect(rows.at(-1)).toEqual({
      workload: 'oneDrive',
      bytes: 70 * GB,
      share: 70 / 520,
      scale: 70 / 300,
      source: 'oneDriveTrend',
    })
  })

  it('leaves a source with no storage out', () => {
    const { rows } = storageUsage(
      inputs({ sites: sites.filter((site) => site.template === 'STS#3'), drives: [] }),
    )
    expect(rows).toEqual([{ workload: 'sharePoint', bytes: 300 * GB, share: 1, scale: 1, source: 'siteReport' }])
  })

  it('returns no rows and no total when nothing is stored', () => {
    expect(storageUsage(inputs({ sites: [], drives: [] }))).toEqual({ rows: [], totalBytes: 0 })
  })
})
