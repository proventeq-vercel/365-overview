import type { GraphClient } from '../clients/graphClient'
import { parseOneDriveAccounts } from '../reports/oneDriveAccounts'
import type { RawDriveRow } from '../reports/oneDriveAccounts'
import { parseSharePointSites, reportRefreshDateOf } from '../reports/sharePointSites'
import type { RawSiteRow } from '../reports/sharePointSites'
import { parseSiteDetails, siteDetailsPath } from '../reports/siteDirectory'
import type { DirectorySite, RawDirectorySite, SiteDirectory } from '../reports/siteDirectory'
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

const SETTLED_STATUSES = new Set([200, 403, 404])

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

  const knownSites = new Map<string, DirectorySite | null>()

  return {
    async getSites() {
      return parseSharePointSites(await rawSites())
    },

    async getSiteDetails(ids) {
      const wanted = [...new Set(ids.map((id) => id.toLowerCase()))]
      const missing = wanted.filter((id) => !knownSites.has(id))
      if (missing.length > 0) {
        const responses = await graph.batchGet<RawDirectorySite>(missing.map(siteDetailsPath))
        const resolved = parseSiteDetails(missing, responses)
        responses.forEach((response, i) => {
          const id = missing[i]
          const site = resolved.get(id)
          if (site) knownSites.set(id, site)
          else if (SETTLED_STATUSES.has(response.status)) knownSites.set(id, null)
        })
      }
      const found: SiteDirectory = new Map()
      for (const id of wanted) {
        const site = knownSites.get(id)
        if (site) found.set(id, site)
      }
      return found
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
