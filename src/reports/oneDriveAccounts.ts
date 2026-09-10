import type { StorageRow } from '@/types/storage'
import { bool, dateOrNull, num } from './sharePointSites'

export interface RawDriveRow {
  reportRefreshDate?: string
  siteUrl?: string
  ownerDisplayName?: string
  ownerPrincipalName?: string
  isDeleted?: string | boolean
  lastActivityDate?: string
  fileCount?: string | number
  activeFileCount?: string | number
  storageUsedInBytes?: string | number
  storageAllocatedInBytes?: string | number
}

export function parseOneDriveAccounts(rows: RawDriveRow[]): StorageRow[] {
  return rows.map((row) => ({
    pool: 'OneDrive' as const,
    id: row.ownerPrincipalName ?? row.siteUrl ?? '',
    url: row.siteUrl ?? '',
    ownerDisplayName: row.ownerDisplayName ?? '',
    storageUsedBytes: num(row.storageUsedInBytes),
    fileCount: num(row.fileCount),
    activeFileCount: num(row.activeFileCount),
    lastActivityDate: dateOrNull(row.lastActivityDate),
    isDeleted: bool(row.isDeleted),
    allocatedBytes: num(row.storageAllocatedInBytes),
  }))
}
