import { useMemo } from 'react'
import { useQuery, type Query } from '@tanstack/react-query'
import { ApiError } from '../clients/apiError'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { hideRowNames } from '../lib/hiddenNames'
import { buildStorageGrowth, earliestRows, rankLeaders } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory, type SiteDirectory } from '../reports/siteDirectory'
import type { StorageGrowth, StorageOverview, StorageRow } from '../types/storage'

const STORAGE_GROWTH_KEY = 'storageGrowth'

const DAILY_REPORTS_AT_ONCE = 4

export const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

const missesDays = (growth: StorageGrowth | undefined) => growth !== undefined && growth.daysRead < growth.daysAsked

export const isCompleteGrowth = (query: Query) =>
  isGrowth(query) && query.state.status === 'success' && !missesDays(query.state.data as StorageGrowth)

export const isIncompleteGrowth = (query: Query) =>
  isGrowth(query) &&
  query.state.fetchStatus !== 'fetching' &&
  (query.state.status === 'error' || missesDays(query.state.data as StorageGrowth | undefined))

type DayRead = { rows: StorageRow[] } | { failure: ApiError }

async function readDay(ds: DataSource, date: string): Promise<DayRead> {
  try {
    const [sites, drives] = await Promise.all([ds.getSitesOn(date), ds.getDrivesOn(date)])
    return { rows: [...sites, ...drives] }
  } catch (error) {
    if (error instanceof ApiError) return { failure: error }
    throw error
  }
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

const windowEndOf = (dates: string[], reportRefreshDate: string) => dates.at(-1) ?? reportRefreshDate

export function useStorageGrowth(overview: StorageOverview | undefined): StorageGrowth | undefined {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { reportRefreshDate, caveats } = overview!
      const masked = caveats.nameMask !== null
      const dates = ds.getDailyReportDates(reportRefreshDate)
      const readDates: string[] = []
      let baseline: StorageRow[] = []
      for (let start = 0; start < dates.length; start += DAILY_REPORTS_AT_ONCE) {
        const batch = dates.slice(start, start + DAILY_REPORTS_AT_ONCE)
        const days = await Promise.all(batch.map((date) => readDay(ds, date)))
        const read: StorageRow[][] = []
        days.forEach((day, i) => {
          if (!('rows' in day)) return
          readDates.push(batch[i])
          read.push(masked ? day.rows.map(hideRowNames) : day.rows)
        })
        baseline = earliestRows([baseline, ...read])
        if (days.some((day) => 'failure' in day && day.failure.isThrottled)) break
      }
      const current = currentRows(overview!)
      const unnamed = masked ? [] : unresolvedSiteIds(rankLeaders(current, baseline).leaders.map((leader) => leader.row))
      const windowEndDate = windowEndOf(dates, reportRefreshDate)
      return buildStorageGrowth({
        current: withSiteDirectory(current, await namesOf(ds, unnamed)),
        baseline,
        baselineDate: readDates[0] ?? null,
        windowEndDate,
        sizesOn: reportRefreshDate || windowEndDate,
        daysRead: readDates.length,
        daysAsked: dates.length,
        measurementFailed: false,
      })
    },
  })
  const failed = query.data === undefined && query.errorUpdateCount > 0
  const bySize = useMemo(() => {
    if (!failed || !overview) return undefined
    const { reportRefreshDate } = overview
    const windowEndDate = windowEndOf(ds.getDailyReportDates(reportRefreshDate), reportRefreshDate)
    return buildStorageGrowth({
      current: currentRows(overview),
      baseline: [],
      baselineDate: null,
      windowEndDate,
      sizesOn: reportRefreshDate || windowEndDate,
      daysRead: 0,
      daysAsked: 0,
      measurementFailed: true,
    })
  }, [failed, overview, ds])
  return query.data ?? bySize
}
