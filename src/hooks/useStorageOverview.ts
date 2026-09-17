import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { buildStorageOverview } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { StorageOverview } from '../types/storage'

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: ['storageInputs'],
    queryFn: async () => {
      const [
        sites,
        drives,
        sharePointTrend,
        oneDriveTrend,
        skus,
        reportRefreshDate,
        displayConcealedNames,
      ] = await Promise.all([
        ds.getSites().then((sites) => nameTopSites(ds, sites)),
        ds.getDrives(),
        ds.getSharePointTrend(),
        ds.getOneDriveTrend(),
        ds.getLicenses(),
        ds.getReportRefreshDate(),
        ds.getReportSettings(),
      ])
      return {
        sites,
        drives,
        sharePointTrend,
        oneDriveTrend,
        skus,
        reportRefreshDate,
        displayConcealedNames,
      }
    },
  })

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
