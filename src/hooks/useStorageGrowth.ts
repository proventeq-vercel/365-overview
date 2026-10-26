import { useQuery, type Query } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { buildStorageGrowth, earliestRows, growthLeaders } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { StorageOverview, StorageRow } from '../types/storage'

export const STORAGE_GROWTH_KEY = 'storageGrowth'

const DAILY_REPORTS_AT_ONCE = 4

export const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

export const isLoadedGrowth = (query: Query) => isGrowth(query) && query.state.status === 'success'

export function useStorageGrowth(overview: StorageOverview | undefined) {
  const ds = useDataSource()
  return useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { reportRefreshDate, sharePoint, oneDrive, caveats } = overview!
      const dates = ds.getDailyReportDates(reportRefreshDate)
      if (dates.length === 0) throw new Error(`No daily usage report is kept for ${reportRefreshDate}`)
      let baseline: StorageRow[] = []
      for (let start = 0; start < dates.length; start += DAILY_REPORTS_AT_ONCE) {
        const days = await Promise.all(
          dates.slice(start, start + DAILY_REPORTS_AT_ONCE).map(async (date) => {
            const [sites, drives] = await Promise.all([ds.getSitesOn(date), ds.getDrivesOn(date)])
            return [...sites, ...drives]
          }),
        )
        baseline = earliestRows([baseline, ...days])
      }
      const current = [...sharePoint.sites, ...oneDrive.drives]
      const unnamed =
        caveats.nameMask === null
          ? unresolvedSiteIds(growthLeaders(current, baseline).map((leader) => leader.row))
          : []
      const names = unnamed.length === 0 ? new Map() : await ds.getSiteDetails(unnamed)
      return buildStorageGrowth({
        current: withSiteDirectory(current, names),
        baseline,
        baselineDate: dates[0],
        reportRefreshDate: dates[dates.length - 1],
      })
    },
  })
}
