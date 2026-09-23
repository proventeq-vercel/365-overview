import type { GraphClient } from '../clients/graphClient'
import { parseOneDriveAccounts } from '../reports/oneDriveAccounts'
import type { RawDriveRow } from '../reports/oneDriveAccounts'
import { parseSharePointSites, reportRefreshDateOf } from '../reports/sharePointSites'
import type { RawSiteRow } from '../reports/sharePointSites'
import {
  parseDeltaSites,
  parseSiteDetails,
  siteDetailsPath,
  siteDirectoryPath,
  SITE_DIRECTORY_PAGE_LIMIT,
} from '../reports/siteDirectory'
import type {
  DirectorySite,
  RawDeltaSite,
  RawDirectorySite,
  SiteDirectory,
} from '../reports/siteDirectory'
import { ApiError } from '../clients/apiError'
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

interface DeltaPage {
  value: RawDeltaSite[]
  '@odata.nextLink'?: string
}

const EMPTY_DIRECTORY: SiteDirectory = new Map()

const REPORTS_BASE = '/beta/reports'

const PERIOD = 'D180'

const reportUrl = (fn: string) =>
  `${REPORTS_BASE}/${fn}(period='${PERIOD}')?$format=application/json`

const SETTLED_STATUSES = new Set([200, 400, 403, 404])

export function createLiveDataSource(graph: GraphClient): DataSource {
  let sitePages: Promise<RawSiteRow[]> | null = null
  const rawSites = () => {
    sitePages ??= graph
      .getAllPages<RawSiteRow>(reportUrl('getSharePointSiteUsageDetail'))
      .finally(() => {
        sitePages = null
      })
    return sitePages
  }

  const siteLookups = new Map<string, Promise<DirectorySite | null | undefined>>()
  const lookUpSites = (ids: string[]) => {
    const batch = graph
      .batchGet<RawDirectorySite>(ids.map(siteDetailsPath))
      .then((responses) => {
        const resolved = parseSiteDetails(ids, responses)
        return ids.map((id, i) =>
          resolved.get(id) ?? (SETTLED_STATUSES.has(responses[i].status) ? null : undefined),
        )
      })
    ids.forEach((id, i) => {
      const lookup = batch.then((sites) => sites[i])
      lookup.then(
        (site) => {
          if (site === undefined) siteLookups.delete(id)
        },
        () => siteLookups.delete(id),
      )
      siteLookups.set(id, lookup)
    })
  }

  let directory: Promise<SiteDirectory> | null = null
  let directoryRefused = false
  const walkDirectory = async (): Promise<SiteDirectory> => {
    const sites: RawDeltaSite[] = []
    let path: string | undefined = siteDirectoryPath()
    for (let page = 0; page < SITE_DIRECTORY_PAGE_LIMIT && path; page += 1) {
      const body: DeltaPage = await graph.get<DeltaPage>(path)
      sites.push(...body.value)
      path = body['@odata.nextLink']
    }
    return parseDeltaSites(sites)
  }

  return {
    async getSites() {
      return parseSharePointSites(await rawSites())
    },

    async getSiteDirectory() {
      if (directoryRefused) return EMPTY_DIRECTORY
      directory ??= walkDirectory()
        .catch((error: unknown) => {
          if (!(error instanceof ApiError)) throw error
          if (error.isForbidden) directoryRefused = true
          return EMPTY_DIRECTORY
        })
        .finally(() => {
          directory = null
        })
      return directory
    },

    async getSiteDetails(ids) {
      const wanted = [...new Set(ids.map((id) => id.toLowerCase()))]
      const missing = wanted.filter((id) => !siteLookups.has(id))
      if (missing.length > 0) lookUpSites(missing)
      const sites = await Promise.all(wanted.map((id) => siteLookups.get(id)))
      const found: SiteDirectory = new Map()
      wanted.forEach((id, i) => {
        const site = sites[i]
        if (site) found.set(id, site)
      })
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
      try {
        return parseSubscribedSkus(await graph.getAllPages<RawSku>('/subscribedSkus'))
      } catch (error) {
        if (error instanceof ApiError) return null
        throw error
      }
    },

    async getOrg() {
      const res = await graph.get<JsonReport<RawOrg>>('/organization?$format=application/json')
      const [org] = res.value
      if (!org) throw new ApiError(404, 'Microsoft Graph returned no organization', 'OrganizationMissing')
      return parseOrg(org)
    },

    async getReportRefreshDate() {
      return reportRefreshDateOf(await rawSites())
    },
  }
}
