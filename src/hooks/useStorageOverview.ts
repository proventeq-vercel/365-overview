import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { buildStorageOverview } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { StorageOverview } from '../types/storage'

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  return useQuery<StorageOverview>({
    queryKey: ['storageOverview', settings],
    queryFn: async () => {
      const [sites, drives, sharePointTrend, oneDriveTrend, skus, reportRefreshDate] =
        await Promise.all([
          ds.getSites(),
          ds.getDrives(),
          ds.getSharePointTrend(),
          ds.getOneDriveTrend(),
          ds.getLicenses(),
          ds.getReportRefreshDate(),
        ])
      return buildStorageOverview({
        sites,
        drives,
        sharePointTrend,
        oneDriveTrend,
        skus,
        reportRefreshDate,
        ratePerGb: settings.ratePerGb,
        currency: settings.currency,
        entitlementOverrideBytes: settings.entitlementOverrideBytes,
      })
    },
  })
}

export function useOrg() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['org'],
    queryFn: () => ds.getOrg(),
  })
}
