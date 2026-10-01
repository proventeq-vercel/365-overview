import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { consentRecentlyGranted, forgetConsentGrant } from '../config/consentReturn'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { withSiteDirectory } from '../reports/siteDirectory'
import { buildStorageOverview } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { StorageOverview } from '../types/storage'
import { accessRecheckInterval, isAccessFailure } from './accessRevalidation'

export const STORAGE_INPUTS_KEY = 'storageInputs'

function useRevalidateOnRecovery(error: unknown, recovered: boolean) {
  const queryClient = useQueryClient()
  const wasRefused = useRef(false)
  useEffect(() => {
    if (isAccessFailure(error)) {
      wasRefused.current = true
      return
    }
    if (!recovered) return
    forgetConsentGrant()
    if (!wasRefused.current) return
    wasRefused.current = false
    void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== STORAGE_INPUTS_KEY })
  }, [error, recovered, queryClient])
}

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: [STORAGE_INPUTS_KEY],
    refetchInterval: (query) => accessRecheckInterval(query.state.error, consentRecentlyGranted(Date.now())),
    refetchOnWindowFocus: (query) => isAccessFailure(query.state.error),
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
  useRevalidateOnRecovery(query.error, inputs !== undefined)
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
