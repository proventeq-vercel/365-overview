import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { growthBaselineDate } from '../lib/growthWindow'
import { buildStorageGrowth, growthLeaders } from '../model/storageGrowth'
import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { StorageOverview } from '../types/storage'

export const STORAGE_GROWTH_KEY = 'storageGrowth'

export function useStorageGrowth(overview: StorageOverview | undefined) {
  const ds = useDataSource()
  return useQuery({
    queryKey: [STORAGE_GROWTH_KEY, overview?.reportRefreshDate, overview?.caveats.nameMask],
    enabled: overview !== undefined,
    queryFn: async () => {
      const { reportRefreshDate, sharePoint, oneDrive, caveats } = overview!
      const baselineDate = growthBaselineDate(reportRefreshDate, new Date())
      const [baselineSites, baselineDrives] = await Promise.all([
        ds.getSitesOn(baselineDate),
        ds.getDrivesOn(baselineDate),
      ])
      const baseline = [...baselineSites, ...baselineDrives]
      const current = [...sharePoint.sites, ...oneDrive.drives]
      const unnamed =
        caveats.nameMask === null
          ? unresolvedSiteIds(growthLeaders(current, baseline).map((leader) => leader.row))
          : []
      const names = unnamed.length === 0 ? new Map() : await ds.getSiteDetails(unnamed)
      return buildStorageGrowth({
        current: withSiteDirectory(current, names),
        baseline,
        baselineDate,
        reportRefreshDate,
      })
    },
  })
}
