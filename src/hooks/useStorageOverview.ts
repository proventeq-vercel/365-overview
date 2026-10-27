import { useEffect, useMemo, useRef } from 'react'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { consentRecentlyGranted, forgetConsentGrant } from '../config/consentReturn'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { namesAreConcealed } from '../lib/concealment'
import { withSiteDirectory } from '../reports/siteDirectory'
import { buildStorageOverview } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { SiteDirectory } from '../reports/siteDirectory'
import { CORE_REPORTS, type StorageOverview, type StorageRow } from '../types/storage'
import { accessRecheckInterval, isAccessFailure } from './accessRevalidation'
import { canReadGrowthAgain, isGrowth } from './useStorageGrowth'

export const STORAGE_INPUTS_KEY = 'storageInputs'

async function readTwice<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (isAccessFailure(error)) throw error
    return read()
  }
}

const valueOr = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback

function refusalOf(results: PromiseSettledResult<unknown>[]): unknown {
  const refused = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected' && isAccessFailure(result.reason),
  )
  return refused?.reason
}

export async function readStorageInputs(ds: DataSource) {
  const [rawSites, drives, sharePointTrend, oneDriveTrend, directory, skus, oneDriveLicences, reportRefreshDate] =
    await Promise.allSettled([
      readTwice(() => ds.getSites()),
      readTwice(() => ds.getDrives()),
      readTwice(() => ds.getSharePointTrend()),
      readTwice(() => ds.getOneDriveTrend()),
      ds.getSiteDirectory(),
      ds.getLicenses(),
      ds.getOneDriveLicences(),
      readTwice(() => ds.getReportRefreshDate()),
    ])
  const core = [rawSites, drives, sharePointTrend, oneDriveTrend]
  const refusal = refusalOf([...core, directory, skus, oneDriveLicences, reportRefreshDate])
  if (refusal !== undefined) throw refusal
  if (core.every((result) => result.status === 'rejected')) throw (rawSites as PromiseRejectedResult).reason

  const siteRows = valueOr(rawSites, [])
  const driveRows = valueOr(drives, [])
  const directoryNamed = withSiteDirectory(siteRows, valueOr<SiteDirectory>(directory, new Map()))
  const sites = namesAreConcealed([...siteRows, ...driveRows])
    ? siteRows
    : await nameTopSites(ds, directoryNamed).catch(() => directoryNamed)
  return {
    sites,
    drives: driveRows,
    sharePointTrend: valueOr(sharePointTrend, []),
    oneDriveTrend: valueOr(oneDriveTrend, []),
    skus: valueOr(skus, null),
    oneDriveLicences: valueOr(oneDriveLicences, null),
    reportRefreshDate: valueOr(reportRefreshDate, ''),
    unreadReports: CORE_REPORTS.filter((_, i) => core[i].status === 'rejected'),
  }
}

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
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== STORAGE_INPUTS_KEY && (!isGrowth(query) || canReadGrowthAgain(query)),
    })
  }, [error, recovered, queryClient])
}

export function useStorageOverview(settings: ReportSettings) {
  const ds = useDataSource()
  const query = useQuery({
    queryKey: [STORAGE_INPUTS_KEY],
    refetchInterval: (query) => accessRecheckInterval(query.state.error, consentRecentlyGranted(Date.now())),
    refetchOnWindowFocus: (query) => isAccessFailure(query.state.error),
    queryFn: () => readStorageInputs(ds),
  })

  const inputs = query.data
  useRevalidateOnRecovery(query.error, inputs !== undefined)
  const blocking = query.error !== null && (inputs === undefined || isAccessFailure(query.error))
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

  return { data, error: blocking ? query.error : null, isPending: query.isPending }
}

export function useOrg() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['org'],
    queryFn: () => ds.getOrg(),
  })
}

export function useNamesConcealed(): boolean {
  const { data } = useQuery<{ sites: StorageRow[] }, Error, boolean>({
    queryKey: [STORAGE_INPUTS_KEY],
    queryFn: skipToken,
    select: (inputs) => namesAreConcealed(inputs.sites),
  })
  return data === true
}
