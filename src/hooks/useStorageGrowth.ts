import { useMemo } from 'react'
import { useQuery, type Query } from '@tanstack/react-query'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { buildStorageGrowth, earliestRows, rankLeaders } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { StorageGrowth, StorageOverview, StorageRow } from '../types/storage'

const STORAGE_GROWTH_KEY = 'storageGrowth'

const DAILY_REPORTS_AT_ONCE = 4

export const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

const isPartial = (growth: StorageGrowth | undefined) => growth !== undefined && growth.daysRead < growth.daysAsked

export const isCompleteGrowth = (query: Query) =>
  isGrowth(query) && query.state.status === 'success' && !isPartial(query.state.data as StorageGrowth)

export const isIncompleteGrowth = (query: Query) =>
  isGrowth(query) && (query.state.status === 'error' || isPartial(query.state.data as StorageGrowth | undefined))

async function readDay(ds: DataSource, date: string): Promise<StorageRow[] | null> {
  try {
    const [sites, drives] = await Promise.all([ds.getSitesOn(date), ds.getDrivesOn(date)])
    return [...sites, ...drives]
  } catch {
    return null
  }
}

const currentRows = ({ sharePoint, oneDrive }: StorageOverview) => [...sharePoint.sites, ...oneDrive.drives]

export function useStorageGrowth(overview: StorageOverview | undefined): StorageGrowth | undefined {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { reportRefreshDate, caveats } = overview!
      const dates = ds.getDailyReportDates(reportRefreshDate)
      const readDates: string[] = []
      let baseline: StorageRow[] = []
      for (let start = 0; start < dates.length; start += DAILY_REPORTS_AT_ONCE) {
        const batch = dates.slice(start, start + DAILY_REPORTS_AT_ONCE)
        const days = await Promise.all(batch.map((date) => readDay(ds, date)))
        days.forEach((rows, i) => {
          if (rows !== null) readDates.push(batch[i])
        })
        baseline = earliestRows([baseline, ...days.filter((rows) => rows !== null)])
      }
      const current = currentRows(overview!)
      const unnamed =
        caveats.nameMask === null
          ? unresolvedSiteIds(rankLeaders(current, baseline).leaders.map((leader) => leader.row))
          : []
      const names = unnamed.length === 0 ? new Map() : await ds.getSiteDetails(unnamed)
      return buildStorageGrowth({
        current: withSiteDirectory(current, names),
        baseline,
        baselineDate: readDates[0] ?? null,
        reportRefreshDate: dates.at(-1) ?? reportRefreshDate,
        sizesOn: reportRefreshDate,
        daysRead: readDates.length,
        daysAsked: dates.length,
      })
    },
  })
  const failed = query.isError
  const bySize = useMemo(
    () =>
      failed && overview
        ? buildStorageGrowth({
            current: currentRows(overview),
            baseline: [],
            baselineDate: null,
            reportRefreshDate: overview.reportRefreshDate,
            sizesOn: overview.reportRefreshDate,
            daysRead: 0,
            daysAsked: 0,
          })
        : undefined,
    [failed, overview],
  )
  return query.data ?? bySize
}
