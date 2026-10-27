import { useMemo } from 'react'
import { useQuery, useQueryClient, type Query } from '@tanstack/react-query'
import { ApiError } from '../clients/apiError'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { hideRowNames } from '../lib/hiddenNames'
import { betterGrowth, buildStorageGrowth, earliestRows, rankLeaders, type ReportsRead } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory, type SiteDirectory } from '../reports/siteDirectory'
import type { StorageGrowth, StorageOverview, StorageRow } from '../types/storage'

const STORAGE_GROWTH_KEY = 'storageGrowth'

const DAILY_REPORTS_AT_ONCE = 4

export const REREAD_COOLDOWN_MS = 10 * 60_000

export const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

export function canReadGrowthAgain(query: Query, now = Date.now()): boolean {
  if (!isGrowth(query) || query.state.fetchStatus === 'fetching') return false
  const growth = query.state.data as StorageGrowth | undefined
  if (growth === undefined) return query.state.status === 'error'
  if (growth.complete) return false
  return now - Math.max(query.state.dataUpdatedAt, query.state.errorUpdatedAt) >= REREAD_COOLDOWN_MS
}

type ReportRead = { rows: StorageRow[] } | { failure: ApiError }

async function readReport(read: () => Promise<StorageRow[]>): Promise<ReportRead> {
  try {
    return { rows: await read() }
  } catch (error) {
    if (error instanceof ApiError) return { failure: error }
    throw error
  }
}

interface ReportProgress {
  read: (date: string) => Promise<StorageRow[]>
  count: number
  stopped: boolean
}

function afterBatch(report: ReportProgress, reads: ReportRead[], firstBatch: boolean) {
  const failures = reads.flatMap((read) => ('failure' in read ? [read.failure] : []))
  const allFailed = failures.length === reads.length
  report.stopped = failures.some((failure) => failure.isThrottled) || (allFailed && !firstBatch)
  report.count += reads.length - failures.length
}

async function namesOf(ds: DataSource, ids: string[]): Promise<SiteDirectory> {
  if (ids.length === 0) return new Map()
  try {
    return await ds.getSiteDetails(ids)
  } catch (error) {
    if (error instanceof ApiError) return new Map()
    throw error
  }
}

const currentRows = ({ sharePoint, oneDrive }: StorageOverview) => [...sharePoint.sites, ...oneDrive.drives]

const sizesDateOf = (dates: string[], reportRefreshDate: string) => reportRefreshDate || (dates.at(-1) ?? '')

interface DailyReads {
  baseline: StorageRow[]
  baselineDate: string | null
  reportsRead: ReportsRead
}

async function readDailyReports(ds: DataSource, dates: string[], masked: boolean): Promise<DailyReads> {
  const report = (read: ReportProgress['read']): ReportProgress => ({ read, count: 0, stopped: false })
  const sharePoint = report(ds.getSitesOn.bind(ds))
  const oneDrive = report(ds.getDrivesOn.bind(ds))
  let baseline: StorageRow[] = []
  let baselineDate: string | null = null
  for (let start = 0; start < dates.length; start += DAILY_REPORTS_AT_ONCE) {
    const open = [sharePoint, oneDrive].filter((progress) => !progress.stopped)
    if (open.length === 0) break
    const batch = dates.slice(start, start + DAILY_REPORTS_AT_ONCE)
    const reads = await Promise.all(open.map((progress) => Promise.all(batch.map((date) => readReport(() => progress.read(date))))))
    const days = batch.map((date, day) => {
      const rows = reads.flatMap((reportReads) => {
        const read = reportReads[day]
        return 'rows' in read ? [masked ? read.rows.map(hideRowNames) : read.rows] : []
      })
      if (rows.length > 0 && baselineDate === null) baselineDate = date
      return rows.flat()
    })
    baseline = earliestRows([baseline, ...days])
    open.forEach((progress, i) => afterBatch(progress, reads[i], start === 0))
  }
  return { baseline, baselineDate, reportsRead: { sharePoint: sharePoint.count, oneDrive: oneDrive.count } }
}

export function useStorageGrowth(overview: StorageOverview | undefined): StorageGrowth | undefined {
  const ds = useDataSource()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async ({ queryKey }) => {
      const { reportRefreshDate, caveats } = overview!
      const masked = caveats.nameMask !== null
      const dates = ds.getDailyReportDates(reportRefreshDate)
      const { baseline, baselineDate, reportsRead } = await readDailyReports(ds, dates, masked)
      const current = currentRows(overview!)
      const unnamed = masked ? [] : unresolvedSiteIds(rankLeaders(current, baseline).leaders.map((leader) => leader.row))
      const growth = buildStorageGrowth({
        current: withSiteDirectory(current, await namesOf(ds, unnamed)),
        baseline,
        baselineDate,
        sizesOn: sizesDateOf(dates, reportRefreshDate),
        dates,
        reportsRead,
        measurementFailed: false,
      })
      return betterGrowth(queryClient.getQueryData<StorageGrowth>(queryKey), growth)
    },
  })
  const failed = query.data === undefined && query.errorUpdateCount > 0
  const bySize = useMemo(() => {
    if (!failed || !overview) return undefined
    const { reportRefreshDate } = overview
    const dates = ds.getDailyReportDates(reportRefreshDate)
    return buildStorageGrowth({
      current: currentRows(overview),
      baseline: [],
      baselineDate: null,
      sizesOn: sizesDateOf(dates, reportRefreshDate),
      dates,
      reportsRead: { sharePoint: 0, oneDrive: 0 },
      measurementFailed: true,
    })
  }, [failed, overview, ds])
  return query.data ?? bySize
}
