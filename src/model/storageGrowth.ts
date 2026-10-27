import { daysBetween } from '@/lib/growthWindow'
import { rowName } from '@/lib/rowName'
import type { GrowthExplanation, GrowthRanking, SizeRankingReason, StorageGrowth, StorageRow } from '@/types/storage'

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
  sizesOn: string
  dates: string[]
  reportsRead: ReportsRead
  measurementFailed: boolean
}

export type ReportsRead = StorageGrowth['reportsRead']

function sizeRankingReason(inputs: GrowthInputs, measuredRows: number, read: number): SizeRankingReason {
  if (inputs.measurementFailed) return 'growthFailed'
  if (inputs.dates.length === 0) return 'reportDateTooOld'
  if (read === 0) return 'noDailyReports'
  return measuredRows === 0 ? 'notMeasured' : 'unchanged'
}

function explanationOf(ranking: GrowthRanking, inputs: GrowthInputs, measuredRows: number, read: number): GrowthExplanation {
  return ranking === 'size' ? sizeRankingReason(inputs, measuredRows, read) : ranking
}

export function buildStorageGrowth(inputs: GrowthInputs): StorageGrowth {
  const { current, baseline, baselineDate, sizesOn, dates, reportsRead, measurementFailed } = inputs
  const measured = new Set(baseline.map(rowKey))
  const measuredRows = current.filter((row) => !row.isDeleted && measured.has(rowKey(row))).length
  const { ranking, leaders } = rankLeaders(current, baseline)
  const read = reportsRead.sharePoint + reportsRead.oneDrive
  const reportsMissing = dates.length * Object.keys(reportsRead).length - read
  const complete = !measurementFailed && reportsMissing === 0
  return {
    ranking,
    explanation: explanationOf(ranking, inputs, measuredRows, read),
    baselineDate,
    sizesOn,
    windowDays: baselineDate === null ? 0 : daysBetween(baselineDate, sizesOn),
    windowFrom: dates[0] ?? null,
    windowTo: dates.at(-1) ?? null,
    daysInWindow: dates.length,
    reportsRead,
    reportsMissing,
    complete,
    missingNote: read > 0 && !complete,
    measuredRows,
    leaders: leaders.map(({ row, valueBytes }) => ({ name: rowName(row), value: valueBytes })),
  }
}

export function betterGrowth(previous: StorageGrowth | undefined, next: StorageGrowth): StorageGrowth {
  const readOf = ({ reportsRead }: StorageGrowth) => reportsRead.sharePoint + reportsRead.oneDrive
  if (previous === undefined || (next.complete && readOf(next) > 0)) return next
  if (readOf(previous) !== readOf(next)) return readOf(previous) > readOf(next) ? previous : next
  const losesAPool =
    next.reportsRead.sharePoint < previous.reportsRead.sharePoint || next.reportsRead.oneDrive < previous.reportsRead.oneDrive
  return losesAPool ? previous : next
}
