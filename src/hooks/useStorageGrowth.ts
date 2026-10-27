import { useMemo } from 'react'
import { useQuery, useQueryClient, type Query } from '@tanstack/react-query'
import { ApiError } from '../clients/apiError'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { hideRowNames } from '../lib/hiddenNames'
import { buildStorageGrowth, earliestRows, rankLeaders } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory, type SiteDirectory } from '../reports/siteDirectory'
import type { MissingReports, StorageGrowth, StorageOverview, StorageRow } from '../types/storage'

const STORAGE_GROWTH_KEY = 'storageGrowth'

const DAILY_REPORTS_AT_ONCE = 4

export const THROTTLE_COOLDOWN_MS = 10 * 60_000

export const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

function waitsOutThrottling(growth: StorageGrowth, updatedAt: number, now: number) {
  return growth.missingReports === 'throttled' && now - updatedAt < THROTTLE_COOLDOWN_MS
}

export function canReadGrowthAgain(query: Query, now = Date.now()): boolean {
  if (!isGrowth(query) || query.state.fetchStatus === 'fetching') return false
  if (query.state.status === 'error') return true
  const growth = query.state.data as StorageGrowth | undefined
  if (growth === undefined || growth.missingReports === null || growth.missingReports === 'refused') return false
  return !waitsOutThrottling(growth, query.state.dataUpdatedAt, now)
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

const isRefusal = (error: ApiError) => error.status >= 400 && error.status < 500 && !error.isThrottled

function stopReason(reads: ReportRead[]): MissingReports | null {
  const failures = reads.flatMap((read) => ('failure' in read ? [read.failure] : []))
  if (failures.some((failure) => failure.isThrottled)) return 'throttled'
  if (failures.length === reads.length && failures.every(isRefusal)) return 'refused'
  return null
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
  reportsRead: number
  missingReports: MissingReports | null
}

async function readDailyReports(ds: DataSource, dates: string[], masked: boolean): Promise<DailyReads> {
  const pools = [ds.getSitesOn.bind(ds), ds.getDrivesOn.bind(ds)].map((read) => ({ read, stopped: null as MissingReports | null }))
  let baseline: StorageRow[] = []
  let baselineDate: string | null = null
  let reportsRead = 0
  for (let start = 0; start < dates.length; start += DAILY_REPORTS_AT_ONCE) {
    const open = pools.filter((pool) => pool.stopped === null)
    if (open.length === 0) break
    const batch = dates.slice(start, start + DAILY_REPORTS_AT_ONCE)
    const reads = await Promise.all(open.map((pool) => Promise.all(batch.map((date) => readReport(() => pool.read(date))))))
    const days = batch.map((date, day) => {
      const rows = reads.flatMap((poolReads) => {
        const read = poolReads[day]
        return 'rows' in read ? [masked ? read.rows.map(hideRowNames) : read.rows] : []
      })
      if (rows.length > 0 && baselineDate === null) baselineDate = date
      reportsRead += rows.length
      return rows.flat()
    })
    baseline = earliestRows([baseline, ...days])
    open.forEach((pool, i) => {
      pool.stopped = stopReason(reads[i])
    })
  }
  const stops = pools.map((pool) => pool.stopped)
  const missingReports =
    stops.find((stop) => stop === 'throttled') ??
    stops.find((stop) => stop === 'refused') ??
    (reportsRead < dates.length * pools.length ? 'notReturned' : null)
  return { baseline, baselineDate, reportsRead, missingReports }
}

export function useStorageGrowth(overview: StorageOverview | undefined): StorageGrowth | undefined {
  const ds = useDataSource()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ queryKey }) => {
      const { reportRefreshDate, caveats } = overview!
      const masked = caveats.nameMask !== null
      const dates = ds.getDailyReportDates(reportRefreshDate)
      const { baseline, baselineDate, reportsRead, missingReports } = await readDailyReports(ds, dates, masked)
      const previous = queryClient.getQueryData<StorageGrowth>(queryKey)
      if (previous !== undefined && previous.reportsRead > reportsRead) return previous
      const current = currentRows(overview!)
      const unnamed = masked ? [] : unresolvedSiteIds(rankLeaders(current, baseline).leaders.map((leader) => leader.row))
      return buildStorageGrowth({
        current: withSiteDirectory(current, await namesOf(ds, unnamed)),
        baseline,
        baselineDate,
        sizesOn: sizesDateOf(dates, reportRefreshDate),
        reportsRead,
        reportsInWindow: dates.length * 2,
        missingReports,
        measurementFailed: false,
      })
    },
  })
  const failed = query.data === undefined && query.errorUpdateCount > 0
  const bySize = useMemo(() => {
    if (!failed || !overview) return undefined
    const { reportRefreshDate } = overview
    return buildStorageGrowth({
      current: currentRows(overview),
      baseline: [],
      baselineDate: null,
      sizesOn: sizesDateOf(ds.getDailyReportDates(reportRefreshDate), reportRefreshDate),
      reportsRead: 0,
      reportsInWindow: 0,
      missingReports: null,
      measurementFailed: true,
    })
  }, [failed, overview, ds])
  return query.data ?? bySize
}
