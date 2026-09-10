import type { UsagePoint } from '@/types/reports'
import { num } from './sharePointSites'

export interface RawTrendRow {
  reportRefreshDate?: string
  reportDate?: string
  siteType?: string
  storageUsedInBytes?: string | number
}

export function parseStorageTrend(rows: RawTrendRow[]): UsagePoint[] {
  const byDate = new Map<string, number>()
  for (const row of rows) {
    if (!row.reportDate) continue
    byDate.set(row.reportDate, (byDate.get(row.reportDate) ?? 0) + num(row.storageUsedInBytes))
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}
