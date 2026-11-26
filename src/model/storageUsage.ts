import { workloadOf } from '@/model/workload'
import type { StorageRow, StorageUsage, StorageUsageRow, Workload } from '@/types/storage'

export interface StorageUsageInputs {
  siteReportRead: boolean
  sites: StorageRow[]
  sharePointUsedBytes: number
  accountReportRead: boolean
  drives: StorageRow[]
  oneDriveUsedBytes: number
}

type Source = Pick<StorageUsageRow, 'workload' | 'bytes' | 'source'>

const liveBytesOf = (rows: StorageRow[], workload: Workload): number =>
  rows
    .filter((row) => !row.isDeleted && workloadOf(row) === workload)
    .reduce((total, row) => total + row.storageUsedBytes, 0)

export function storageUsage({
  siteReportRead,
  sites,
  sharePointUsedBytes,
  accountReportRead,
  drives,
  oneDriveUsedBytes,
}: StorageUsageInputs): StorageUsage {
  const sources: Source[] = siteReportRead
    ? [
        { workload: 'sharePoint', bytes: liveBytesOf(sites, 'sharePoint'), source: 'siteReport' },
        { workload: 'teams', bytes: liveBytesOf(sites, 'teams'), source: 'siteReport' },
      ]
    : [{ workload: 'sharePoint', bytes: sharePointUsedBytes, source: 'sharePointTrend' }]
  sources.push(
    accountReportRead
      ? { workload: 'oneDrive', bytes: liveBytesOf(drives, 'oneDrive'), source: 'accountReport' }
      : { workload: 'oneDrive', bytes: oneDriveUsedBytes, source: 'oneDriveTrend' },
  )

  const drawn = sources.filter((source) => source.bytes > 0)
  const totalBytes = drawn.reduce((total, source) => total + source.bytes, 0)
  const largestBytes = Math.max(0, ...drawn.map((source) => source.bytes))
  return {
    rows: drawn.map((source) => ({
      ...source,
      share: source.bytes / totalBytes,
      scale: source.bytes / largestBytes,
    })),
    totalBytes,
  }
}
