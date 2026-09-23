import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { withSiteDirectory } from '../reports/siteDirectory'
import { buildStorageOverview, licenceEstimateOf } from '../model/storageOverview'
import type { DataSource } from '../data/dataSource'
import type { ReportSettings } from '../lib/settings'
import type { StorageOverview } from '../types/storage'

const storageInputsQuery = (ds: DataSource) => ({
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

export function useLicenceEstimateBytes(): number | null {
  const ds = useDataSource()
  const query = useQuery({
    ...storageInputsQuery(ds),
    select: (inputs) => licenceEstimateOf(inputs.skus),
    refetchOnMount: false,
  })
  return query.data ?? null
}

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  const query = useQuery(storageInputsQuery(ds))

  const inputs = query.data
  const data: StorageOverview | undefined = useMemo(
    () =>
      inputs === undefined
        ? undefined
        : buildStorageOverview({
            ...inputs,
            ratePerGb: settings.ratePerGb,
            currency: settings.currency,
            entitlementOverrideBytes: settings.entitlementOverrideBytes,
          }),
    [inputs, settings.ratePerGb, settings.currency, settings.entitlementOverrideBytes],
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
