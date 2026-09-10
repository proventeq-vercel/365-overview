import type { GraphClient } from '../clients/graphClient'
import { parseOrg } from '../reports/org'
import type { RawOrg } from '../reports/org'
import { parseSubscribedSkus } from '../reports/licensing'
import type { RawSku } from '../reports/licensing'
import { parseSharePointDetail } from '../reports/sharepoint'
import type { RawSpoRow } from '../reports/sharepoint'
import type { ReportPeriod } from '../types/reports'
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

export function createLiveDataSource(graph: GraphClient): DataSource {
  return {
    async getSharePoint(period: ReportPeriod) {
      const rows = await graph.getAllPages<RawSpoRow>(
        `${REPORTS_BASE}/getSharePointSiteUsageDetail(period='${period}')?$format=application/json`,
      )
      return parseSharePointDetail(rows)
    },

    async getLicenses() {
      const rows = await graph.getAllPages<RawSku>('/subscribedSkus')
      return parseSubscribedSkus(rows)
    },

    async getOrg() {
      const res = await graph.get<JsonReport<RawOrg>>(
        '/organization?$format=application/json',
      )
      return parseOrg(res.value[0])
    },
  }
}
