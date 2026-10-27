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

function largestFirst(leaders: GrowthLeader[], limit: number): GrowthLeader[] {
  const top: GrowthLeader[] = []
  for (const leader of leaders) {
    if (top.length === limit && leader.valueBytes <= top[limit - 1].valueBytes) continue
    const at = top.findIndex((kept) => leader.valueBytes > kept.valueBytes)
    top.splice(at === -1 ? top.length : at, 0, leader)
    if (top.length > limit) top.pop()
  }
  return top
}

export function rankLeaders(current: StorageRow[], baseline: StorageRow[], limit = TOP_GROWERS): RankedLeaders {
  const changes = sizeChanges(current, baseline)
  const grown = changes.filter((change) => change.valueBytes > 0)
  if (grown.length > 0) return { ranking: 'growth', leaders: largestFirst(grown, limit) }
  const shrunk = changes
    .filter((change) => change.valueBytes < 0)
    .map((change) => ({ row: change.row, valueBytes: -change.valueBytes }))
  if (shrunk.length > 0) return { ranking: 'shrink', leaders: largestFirst(shrunk, limit) }
  const sizes = current
    .filter((row) => !row.isDeleted && row.storageUsedBytes > 0)
    .map((row) => ({ row, valueBytes: row.storageUsedBytes }))
  return { ranking: 'size', leaders: largestFirst(sizes, limit) }
}

export interface GrowthInputs {
  current: StorageRow[]
  baseline: StorageRow[]
  baselineDate: string | null
  windowEndDate: string
  sizesOn: string
  daysRead: number
  daysAsked: number
  measurementFailed: boolean
}

function sizeRankingReason(inputs: GrowthInputs, measuredRows: number): SizeRankingReason {
  if (inputs.measurementFailed) return 'growthFailed'
  if (inputs.daysAsked === 0) return 'reportDateTooOld'
  if (inputs.daysRead === 0) return 'noDailyReports'
  return measuredRows === 0 ? 'notMeasured' : 'unchanged'
}

export function buildStorageGrowth(inputs: GrowthInputs): StorageGrowth {
  const { current, baseline, baselineDate, windowEndDate, sizesOn, daysRead, daysAsked } = inputs
  const measured = new Set(baseline.map(rowKey))
  const measuredRows = current.filter((row) => !row.isDeleted && measured.has(rowKey(row))).length
  const { ranking, leaders } = rankLeaders(current, baseline)
  return {
    ranking,
    sizeRankingReason: ranking === 'size' ? sizeRankingReason(inputs, measuredRows) : null,
    baselineDate,
    windowEndDate,
    sizesOn,
    windowDays: baselineDate === null ? 0 : daysBetween(baselineDate, windowEndDate),
    daysRead,
    daysAsked,
    someDaysMissing: daysRead > 0 && daysRead < daysAsked,
    measuredRows,
    leaders: leaders.map(({ row, valueBytes }) => ({ name: rowName(row), value: valueBytes })),
  }
}
