import { describe, expect, it } from 'vitest'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { storageUsageRows } from './storageUsageRows'
import { base } from './testFixtures'

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

const overview = (
  sharePoint: Partial<StorageOverview['sharePoint']> = {},
  oneDrive: Partial<StorageOverview['oneDrive']> = {},
): StorageOverview => ({
  ...base,
  sharePoint: { ...base.sharePoint, sites, ...sharePoint },
  oneDrive: { ...base.oneDrive, drives, ...oneDrive },
})

describe('storageUsageRows', () => {
  it('splits live storage into SharePoint, Teams and OneDrive, leaving deleted sites and OneDrives out', () => {
    expect(storageUsageRows(overview())).toEqual({
      rows: [
        { workload: 'sharePoint', bytes: 300 * GB, share: 0.6, teamsIncluded: false },
        { workload: 'teams', bytes: 150 * GB, share: 0.3, teamsIncluded: false },
        { workload: 'oneDrive', bytes: 50 * GB, share: 0.1, teamsIncluded: false },
      ],
      totalBytes: 500 * GB,
    })
  })

  it('puts the whole SharePoint pool on one SharePoint row, Teams included, when the site report did not come back', () => {
    const { rows } = storageUsageRows(overview({ siteReportRead: false, usedBytes: 450 * GB }))
    expect(rows.map(({ workload, bytes, teamsIncluded }) => [workload, bytes, teamsIncluded])).toEqual([
      ['sharePoint', 450 * GB, true],
      ['oneDrive', 50 * GB, false],
    ])
  })

  it('takes OneDrive from the storage trend when the account report did not come back', () => {
    const { rows } = storageUsageRows(overview({}, { accountReportRead: false, usedBytes: 70 * GB }))
    expect(rows.at(-1)).toEqual({ workload: 'oneDrive', bytes: 70 * GB, share: 70 / 520, teamsIncluded: false })
  })

  it('leaves a source with no storage out', () => {
    const { rows } = storageUsageRows(overview({ sites: sites.filter((site) => site.template === 'STS#3') }, { drives: [] }))
    expect(rows).toEqual([{ workload: 'sharePoint', bytes: 300 * GB, share: 1, teamsIncluded: false }])
  })

  it('returns no rows and no total when nothing is stored', () => {
    expect(storageUsageRows(overview({ sites: [] }, { drives: [] }))).toEqual({ rows: [], totalBytes: 0 })
  })
})
