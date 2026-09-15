import type { GraphClient } from '../clients/graphClient'
import { parseOneDriveAccounts } from '../reports/oneDriveAccounts'
import type { RawDriveRow } from '../reports/oneDriveAccounts'
import { parseSharePointSites, reportRefreshDateOf } from '../reports/sharePointSites'
import type { RawSiteRow } from '../reports/sharePointSites'
import { parseSiteDirectory, withSiteDirectory } from '../reports/siteDirectory'
import type { RawDirectorySite } from '../reports/siteDirectory'
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

const REPORTS_BASE = 'https://graph.microsoft.com/beta/reports'

const PERIOD = 'D180'

const reportUrl = (fn: string) =>
  `${REPORTS_BASE}/${fn}(period='${PERIOD}')?$format=application/json`

const SITE_DIRECTORY_URL = '/sites?search=*'

export function createLiveDataSource(graph: GraphClient): DataSource {
  let sitePages: Promise<RawSiteRow[]> | null = null
  const rawSites = () => {
    sitePages ??= graph
      .getAllPages<RawSiteRow>(reportUrl('getSharePointSiteUsageDetail'))
      .catch((error: unknown) => {
        sitePages = null
        throw error
      })
    return sitePages
  }

  return {
    async getSites() {
      const [rows, directory] = await Promise.all([
        rawSites(),
        graph.getAllPages<RawDirectorySite>(SITE_DIRECTORY_URL),
      ])
      return withSiteDirectory(parseSharePointSites(rows), parseSiteDirectory(directory))
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
