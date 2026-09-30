import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { withSiteDirectory } from '../reports/siteDirectory'
import { buildStorageOverview } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { StorageOverview } from '../types/storage'

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: ['storageInputs'],
    queryFn: async () => {
      const [rawSites, directory, drives, sharePointTrend, oneDriveTrend, skus, reportRefreshDate] =
        await Promise.all([
          ds.getSites(),
          ds.getSiteDirectory(),
          ds.getDrives(),
          ds.getSharePointTrend(),
          ds.getOneDriveTrend(),
          ds.getLicenses(),
          ds.getReportRefreshDate(),
        ])
      const sites = await nameTopSites(ds, withSiteDirectory(rawSites, directory))
      return { sites, drives, sharePointTrend, oneDriveTrend, skus, reportRefreshDate }
    },
  })

  const inputs = query.data
  const data: StorageOverview | undefined = useMemo(
    () =>
      inputs === undefined
        ? undefined
        : buildStorageOverview({
            ...inputs,
            namesHidden: ds.namesHidden,
            ratePerGb: settings.ratePerGb,
            currency: settings.currency,
            entitlementOverrideBytes: settings.entitlementOverrideBytes,
            oneDriveEntitlementOverrideBytes: settings.oneDriveEntitlementOverrideBytes,
            inactiveYears: settings.inactiveYears,
          }),
    [
      inputs,
      ds.namesHidden,
      settings.ratePerGb,
      settings.currency,
      settings.entitlementOverrideBytes,
      settings.oneDriveEntitlementOverrideBytes,
      settings.inactiveYears,
    ],
  )

  return { data, error: query.error, isPending: query.isPending }
}

export function useOrg() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['org'],
    queryFn: () => ds.getOrg(),
  })
}
