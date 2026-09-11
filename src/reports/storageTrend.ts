import type { UsagePoint } from '@/types/reports'
import { num } from './sharePointSites'

export interface RawTrendRow {
  reportRefreshDate?: string
  reportDate?: string
  siteType?: string
  storageUsedInBytes?: string | number
}

const TENANT_TOTAL_SITE_TYPE = 'All'

export function parseStorageTrend(rows: RawTrendRow[]): UsagePoint[] {
  const totals = new Map<string, number>()
  const partials = new Map<string, number>()
  for (const row of rows) {
    if (!row.reportDate) continue
    const bytes = num(row.storageUsedInBytes)
    if (row.siteType === TENANT_TOTAL_SITE_TYPE) {
      totals.set(row.reportDate, bytes)
    } else {
      partials.set(row.reportDate, (partials.get(row.reportDate) ?? 0) + bytes)
    }
  }
  const dates = new Set([...totals.keys(), ...partials.keys()])
  return [...dates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({ date, value: totals.get(date) ?? partials.get(date) ?? 0 }))
}
