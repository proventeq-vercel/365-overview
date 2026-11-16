import { workloadOf } from '@/model/storageOverview'
import type { StorageOverview, StorageRow, Workload } from '@/types/storage'

export interface StorageUsageRow {
  workload: Workload
  bytes: number
  share: number
  teamsIncluded: boolean
}

export interface StorageUsageRows {
  rows: StorageUsageRow[]
  totalBytes: number
}

const liveBytesOf = (rows: StorageRow[], workload: Workload): number =>
  rows
    .filter((row) => !row.isDeleted && workloadOf(row) === workload)
    .reduce((total, row) => total + row.storageUsedBytes, 0)

export function storageUsageRows({ sharePoint, oneDrive }: StorageOverview): StorageUsageRows {
  const sources: Omit<StorageUsageRow, 'share'>[] = sharePoint.siteReportRead
    ? [
        { workload: 'sharePoint', bytes: liveBytesOf(sharePoint.sites, 'sharePoint'), teamsIncluded: false },
        { workload: 'teams', bytes: liveBytesOf(sharePoint.sites, 'teams'), teamsIncluded: false },
      ]
    : [{ workload: 'sharePoint', bytes: sharePoint.usedBytes, teamsIncluded: true }]
  sources.push({
    workload: 'oneDrive',
    bytes: oneDrive.accountReportRead ? liveBytesOf(oneDrive.drives, 'oneDrive') : oneDrive.usedBytes,
    teamsIncluded: false,
  })

  const drawn = sources.filter((source) => source.bytes > 0)
  const totalBytes = drawn.reduce((total, source) => total + source.bytes, 0)
  return {
    rows: drawn.map((source) => ({ ...source, share: source.bytes / totalBytes })),
    totalBytes,
  }
}
