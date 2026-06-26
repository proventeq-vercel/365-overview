import type { SharePointSite, SharePointSummary } from '../types/reports'

export interface RawSpoRow {
  siteId: string
  siteUrl: string
  ownerDisplayName: string
  fileCount: number | string
  activeFileCount: number | string
  storageUsedInBytes: number | string
  storageAllocatedInBytes: number | string
}

const num = (v: number | string | undefined) => Number(v ?? 0) || 0

export function parseSharePointDetail(rows: RawSpoRow[]): SharePointSummary {
  const sites: SharePointSite[] = rows.map((r) => ({
    siteId: r.siteId,
    siteUrl: r.siteUrl,
    ownerDisplayName: r.ownerDisplayName,
    fileCount: num(r.fileCount),
    activeFileCount: num(r.activeFileCount),
    storageUsedBytes: num(r.storageUsedInBytes),
    storageAllocatedBytes: num(r.storageAllocatedInBytes),
  }))
  return {
    totalSites: sites.length,
    totalFiles: sites.reduce((a, s) => a + s.fileCount, 0),
    activeFiles: sites.reduce((a, s) => a + s.activeFileCount, 0),
    storageUsedBytes: sites.reduce((a, s) => a + s.storageUsedBytes, 0),
    storageAllocatedBytes: sites.reduce((a, s) => a + s.storageAllocatedBytes, 0),
    sites,
  }
}
