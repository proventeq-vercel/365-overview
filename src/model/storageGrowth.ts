import { daysBetween } from '@/lib/growthWindow'
import { rowName } from '@/lib/rowName'
import type { StorageGrowth, StorageRow } from '@/types/storage'

export const TOP_GROWERS = 10

export interface GrowthLeader {
  row: StorageRow
  growthBytes: number
}

const rowKey = (row: StorageRow) => `${row.pool}:${row.id.toLowerCase()}`

export function earliestRows(days: StorageRow[][]): StorageRow[] {
  const first = new Map<string, StorageRow>()
  for (const rows of days) {
    for (const row of rows) {
      if (!first.has(rowKey(row))) first.set(rowKey(row), row)
    }
  }
  return [...first.values()]
}

export function growthLeaders(
  current: StorageRow[],
  baseline: StorageRow[],
  limit = TOP_GROWERS,
): GrowthLeader[] {
  const before = new Map(baseline.map((row) => [rowKey(row), row.storageUsedBytes]))
  return current
    .filter((row) => !row.isDeleted)
    .flatMap((row) => {
      const earlier = before.get(rowKey(row))
      return earlier === undefined ? [] : [{ row, growthBytes: row.storageUsedBytes - earlier }]
    })
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
  const measured = new Set(baseline.map(rowKey))
  return {
    baselineDate,
    reportRefreshDate,
    windowDays: daysBetween(baselineDate, reportRefreshDate),
    measuredRows: current.filter((row) => !row.isDeleted && measured.has(rowKey(row))).length,
    topGrowers: growthLeaders(current, baseline).map(({ row, growthBytes }) => ({
      name: rowName(row),
      value: growthBytes,
    })),
  }
}
