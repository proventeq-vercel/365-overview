import { useEffect, useMemo, useRef } from 'react'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { consentRecentlyGranted, forgetConsentGrant } from '../config/consentReturn'
import type { DataSource } from '../data/fixtures'
import { useDataSource } from '../data/useDataSource'
import { nameTopSites } from '../data/namedSites'
import { namesAreConcealed } from '../lib/concealment'
import { withSiteDirectory } from '../reports/siteDirectory'
import { buildStorageOverview, holdsStorage } from '../model/storageOverview'
import type { ReportSettings } from '../lib/settings'
import type { SiteDirectory } from '../reports/siteDirectory'
import { CORE_REPORTS, type CoreReport, type StorageOverview, type StorageRow } from '../types/storage'
import type { LicenseSku, UsagePoint } from '../types/reports'
import type { OneDriveLicences } from '../reports/activeUsers'
import { wasThrottled } from '../clients/apiError'
import { accessRecheckInterval, isAccessFailure } from './accessRevalidation'
import { canReadGrowthAgain, isGrowth } from './useStorageGrowth'

export const STORAGE_INPUTS_KEY = 'storageInputs'

async function readTwice<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (isAccessFailure(error) || wasThrottled(error)) throw error
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

export interface StorageInputs {
  sites: StorageRow[]
  drives: StorageRow[]
  sharePointTrend: UsagePoint[]
  oneDriveTrend: UsagePoint[]
  skus: LicenseSku[] | null
  oneDriveLicences: OneDriveLicences | null
  reportRefreshDate: string
  unreadReports: CoreReport[]
}

export async function readStorageInputs(ds: DataSource, onScreen?: StorageInputs): Promise<StorageInputs> {
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
  const unreadReports = CORE_REPORTS.filter((_, i) => core[i].status === 'rejected')
  if (onScreen !== undefined && unreadReports.some((report) => !onScreen.unreadReports.includes(report))) {
    return onScreen
  }
  const rowsRead = rawSites.status === 'fulfilled' || drives.status === 'fulfilled'
  const trendsHoldStorage = [sharePointTrend, oneDriveTrend].some(
    (trend) => trend.status === 'fulfilled' && holdsStorage(trend.value),
  )
  const firstFailure = core.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (firstFailure !== undefined && !rowsRead && !trendsHoldStorage) throw firstFailure.reason

  const driveRows = valueOr(drives, [])
  return {
    sites: await namedSites(ds, valueOr(rawSites, []), driveRows, directory),
    drives: driveRows,
    sharePointTrend: valueOr(sharePointTrend, []),
    oneDriveTrend: valueOr(oneDriveTrend, []),
    skus: valueOr(skus, null),
    oneDriveLicences: valueOr(oneDriveLicences, null),
    reportRefreshDate: valueOr(reportRefreshDate, ''),
    unreadReports,
  }
}

async function namedSites(
  ds: DataSource,
  siteRows: StorageRow[],
  driveRows: StorageRow[],
  directory: PromiseSettledResult<SiteDirectory>,
): Promise<StorageRow[]> {
  if (namesAreConcealed([...siteRows, ...driveRows])) return siteRows
  const directoryNamed = withSiteDirectory(siteRows, valueOr<SiteDirectory>(directory, new Map()))
  return nameTopSites(ds, directoryNamed).catch(() => directoryNamed)
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
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [STORAGE_INPUTS_KEY],
    refetchInterval: (query) => accessRecheckInterval(query.state.error, consentRecentlyGranted(Date.now())),
    refetchOnWindowFocus: (query) => isAccessFailure(query.state.error),
    retry: false,
    queryFn: () => readStorageInputs(ds, queryClient.getQueryData<StorageInputs>([STORAGE_INPUTS_KEY])),
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
  const { data } = useQuery<StorageInputs, Error, boolean>({
    queryKey: [STORAGE_INPUTS_KEY],
    queryFn: skipToken,
    select: (inputs) => namesAreConcealed([...inputs.sites, ...inputs.drives]),
  })
  return data === true
}
