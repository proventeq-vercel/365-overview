import type { SharePointSite, SharePointSummary } from '../types/reports'

export interface RawSpoRow {
  'Site Id': string
  'Site URL': string
  'Owner Display Name': string
  'File Count': string
  'Active File Count': string
  'Storage Used (Byte)': string
  'Storage Allocated (Byte)': string
}

const num = (v: string | undefined) => Number(v ?? 0) || 0

export function parseSharePointDetail(rows: RawSpoRow[]): SharePointSummary {
  const sites: SharePointSite[] = rows.map((r) => ({
    siteId: r['Site Id'],
    siteUrl: r['Site URL'],
    ownerDisplayName: r['Owner Display Name'],
    fileCount: num(r['File Count']),
    activeFileCount: num(r['Active File Count']),
    storageUsedBytes: num(r['Storage Used (Byte)']),
    storageAllocatedBytes: num(r['Storage Allocated (Byte)']),
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
