import { daysBetween } from '@/lib/growthWindow'
import { rowName } from '@/lib/rowName'
import type { StorageGrowth, StorageRow } from '@/types/storage'

export const TOP_GROWERS = 10

export interface GrowthLeader {
  row: StorageRow
  growthBytes: number
}

const rowKey = (row: StorageRow) => `${row.pool}:${row.id.toLowerCase()}`

export function growthLeaders(
  current: StorageRow[],
  baseline: StorageRow[],
  limit = TOP_GROWERS,
): GrowthLeader[] {
  const before = new Map(baseline.map((row) => [rowKey(row), row.storageUsedBytes]))
  return current
    .filter((row) => !row.isDeleted)
    .map((row) => ({ row, growthBytes: row.storageUsedBytes - (before.get(rowKey(row)) ?? 0) }))
    .filter((leader) => leader.growthBytes > 0)
    .sort((a, b) => b.growthBytes - a.growthBytes)
    .slice(0, limit)
}

export interface GrowthInputs {
  current: StorageRow[]
  baseline: StorageRow[]
  baselineDate: string
  reportRefreshDate: string
}

export function buildStorageGrowth(inputs: GrowthInputs): StorageGrowth {
  const { current, baseline, baselineDate, reportRefreshDate } = inputs
  return {
    baselineDate,
    reportRefreshDate,
    windowDays: daysBetween(baselineDate, reportRefreshDate),
    topGrowers: growthLeaders(current, baseline).map(({ row, growthBytes }) => ({
      name: rowName(row),
      value: growthBytes,
    })),
  }
}
