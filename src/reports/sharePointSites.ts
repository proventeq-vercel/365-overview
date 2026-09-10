import type { StorageRow } from '@/types/storage'

export interface RawSiteRow {
  reportRefreshDate?: string
  siteId?: string
  siteUrl?: string
  ownerDisplayName?: string
  isDeleted?: string | boolean
  lastActivityDate?: string
  fileCount?: string | number
  activeFileCount?: string | number
  storageUsedInBytes?: string | number
  storageAllocatedInBytes?: string | number
  rootWebTemplate?: string
}

export const num = (value: string | number | undefined): number => Number(value ?? 0) || 0

export const bool = (value: string | boolean | undefined): boolean =>
  value === true || String(value).toLowerCase() === 'true'

export const dateOrNull = (value: string | undefined): string | null => value || null

export function reportRefreshDateOf(rows: { reportRefreshDate?: string }[]): string {
  return rows.find((row) => row.reportRefreshDate)?.reportRefreshDate ?? ''
}

export function parseSharePointSites(rows: RawSiteRow[]): StorageRow[] {
  return rows.map((row) => ({
    pool: 'SharePoint' as const,
    id: row.siteId ?? row.siteUrl ?? '',
    url: row.siteUrl ?? '',
    ownerDisplayName: row.ownerDisplayName ?? '',
    storageUsedBytes: num(row.storageUsedInBytes),
    fileCount: num(row.fileCount),
    activeFileCount: num(row.activeFileCount),
    lastActivityDate: dateOrNull(row.lastActivityDate),
    isDeleted: bool(row.isDeleted),
    template: row.rootWebTemplate,
    // allocatedBytes is deliberately NOT set. For a site this field is the
    // 25 TB site-collection maximum, not a quota share — summing it or taking
    // a percentage of it produces a meaningless figure.
  }))
}
