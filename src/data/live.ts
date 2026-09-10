import type { GraphClient } from '../clients/graphClient'
import { parseOneDriveAccounts } from '../reports/oneDriveAccounts'
import type { RawDriveRow } from '../reports/oneDriveAccounts'
import { parseSharePointSites, reportRefreshDateOf } from '../reports/sharePointSites'
import type { RawSiteRow } from '../reports/sharePointSites'
import { parseStorageTrend } from '../reports/storageTrend'
import type { RawTrendRow } from '../reports/storageTrend'
import { parseSubscribedSkus } from '../reports/licensing'
import type { RawSku } from '../reports/licensing'
import { parseOrg } from '../reports/org'
import type { RawOrg } from '../reports/org'
import type { DataSource } from './fixtures'

interface JsonReport<T> {
  value: T[]
}

/**
 * Base for the `/reports/*` functions. These only return JSON on the `/beta`
 * endpoint — on `/v1.0` they return CSV (via a 302 redirect) and reject
 * `$format=application/json` with "JSON format is not supported." The graph
 * client passes absolute URLs through unchanged, so report calls use this base
 * while non-report calls (`/organization`, `/subscribedSkus`) stay on the
 * client's default `/v1.0` base, where JSON is native.
 */
const REPORTS_BASE = 'https://graph.microsoft.com/beta/reports'

const PERIOD = 'D180'

const reportUrl = (fn: string) =>
  `${REPORTS_BASE}/${fn}(period='${PERIOD}')?$format=application/json`

export function createLiveDataSource(graph: GraphClient): DataSource {
  let sitePages: Promise<RawSiteRow[]> | null = null
  const rawSites = () => {
    sitePages ??= graph.getAllPages<RawSiteRow>(reportUrl('getSharePointSiteUsageDetail'))
    return sitePages
  }

  return {
    async getSites() {
      return parseSharePointSites(await rawSites())
    },

    async getDrives() {
      const rows = await graph.getAllPages<RawDriveRow>(
        reportUrl('getOneDriveUsageAccountDetail'),
      )
      return parseOneDriveAccounts(rows)
    },

    async getSharePointTrend() {
      const res = await graph.get<JsonReport<RawTrendRow>>(
        reportUrl('getSharePointSiteUsageStorage'),
      )
      return parseStorageTrend(res.value)
    },

    async getOneDriveTrend() {
      const res = await graph.get<JsonReport<RawTrendRow>>(
        reportUrl('getOneDriveUsageStorage'),
      )
      return parseStorageTrend(res.value)
    },

    async getLicenses() {
      return parseSubscribedSkus(await graph.getAllPages<RawSku>('/subscribedSkus'))
    },

    async getOrg() {
      const res = await graph.get<JsonReport<RawOrg>>('/organization?$format=application/json')
      return parseOrg(res.value[0])
    },

    async getReportRefreshDate() {
      return reportRefreshDateOf(await rawSites())
    },
  }
}
