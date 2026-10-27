import { daysBetween } from '@/lib/growthWindow'
import { rowName } from '@/lib/rowName'
import type { GrowthRanking, SizeRankingReason, StorageGrowth, StorageRow } from '@/types/storage'

export const TOP_GROWERS = 10

export interface GrowthLeader {
  row: StorageRow
  valueBytes: number
}

export interface RankedLeaders {
  ranking: GrowthRanking
  leaders: GrowthLeader[]
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

function sizeChanges(current: StorageRow[], baseline: StorageRow[]): GrowthLeader[] {
  const before = new Map(baseline.map((row) => [rowKey(row), row.storageUsedBytes]))
  return current
    .filter((row) => !row.isDeleted)
    .flatMap((row) => {
      const earlier = before.get(rowKey(row))
      return earlier === undefined ? [] : [{ row, valueBytes: row.storageUsedBytes - earlier }]
    })
}

const largestFirst = (leaders: GrowthLeader[], limit: number) =>
  leaders.sort((a, b) => b.valueBytes - a.valueBytes).slice(0, limit)

export function rankLeaders(current: StorageRow[], baseline: StorageRow[], limit = TOP_GROWERS): RankedLeaders {
  const changes = sizeChanges(current, baseline)
  const grown = changes.filter((change) => change.valueBytes > 0)
  if (grown.length > 0) return { ranking: 'growth', leaders: largestFirst(grown, limit) }
  const shrunk = changes
    .filter((change) => change.valueBytes < 0)
    .map((change) => ({ row: change.row, valueBytes: -change.valueBytes }))
  if (shrunk.length > 0) return { ranking: 'shrink', leaders: largestFirst(shrunk, limit) }
  const sizes = current.filter((row) => !row.isDeleted).map((row) => ({ row, valueBytes: row.storageUsedBytes }))
  return { ranking: 'size', leaders: largestFirst(sizes, limit) }
}

export interface GrowthInputs {
  current: StorageRow[]
  baseline: StorageRow[]
  baselineDate: string | null
  reportRefreshDate: string
  sizesOn: string
  daysRead: number
  daysAsked: number
}

function sizeRankingReason(daysRead: number, measuredRows: number): SizeRankingReason {
  if (daysRead === 0) return 'noDailyReports'
  return measuredRows === 0 ? 'notMeasured' : 'unchanged'
}

export function buildStorageGrowth(inputs: GrowthInputs): StorageGrowth {
  const { current, baseline, baselineDate, reportRefreshDate, sizesOn, daysRead, daysAsked } = inputs
  const measured = new Set(baseline.map(rowKey))
  const measuredRows = current.filter((row) => !row.isDeleted && measured.has(rowKey(row))).length
  const { ranking, leaders } = rankLeaders(current, baseline)
  return {
    ranking,
    sizeRankingReason: ranking === 'size' ? sizeRankingReason(daysRead, measuredRows) : null,
    baselineDate,
    reportRefreshDate,
    sizesOn,
    windowDays: baselineDate === null ? 0 : daysBetween(baselineDate, reportRefreshDate),
    daysRead,
    daysAsked,
    measuredRows,
    leaders: leaders.map(({ row, valueBytes }) => ({ name: rowName(row), value: valueBytes })),
  }
}
