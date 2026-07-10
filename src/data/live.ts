import type { ArmClient } from '../clients/armClient'
import type { GraphClient } from '../clients/graphClient'
import { parseResourceCounts, parseSubscriptions, parseCostQuery } from '../reports/azure'
import type { RawCostQuery } from '../reports/azure'
import { parseOrg, parseUsageCounts } from '../reports/estate'
import type { RawOrg } from '../reports/estate'
import { parseEmailActivity, parseMailboxStorage, parseMailboxSummary } from '../reports/exchange'
import type { RawEmailRow, RawMailboxRow, RawMailboxStorageRow } from '../reports/exchange'
import { parseSubscribedSkus } from '../reports/licensing'
import type { RawSku } from '../reports/licensing'
import { parseSharePointDetail } from '../reports/sharepoint'
import type { RawSpoRow } from '../reports/sharepoint'
import type { ReportPeriod } from '../types/reports'
import type { DataSource } from './fixtures'

/** Microsoft Graph report responses with ?$format=application/json wrap rows in `value`. */
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

/**
 * Cost Management query body: month-to-date actual cost, aggregated to a single
 * total (no grouping). Mirrors the body documented in the task brief.
 */
const costBody = {
  type: 'ActualCost',
  timeframe: 'MonthToDate',
  dataset: {
    granularity: 'None',
    aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
    grouping: [],
  },
}

export function createLiveDataSource(graph: GraphClient, arm: ArmClient): DataSource {
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

    async getActiveUsers(period: ReportPeriod) {
      // 'office365' = combined active users across all M365 services.
      const res = await graph.get<JsonReport<Record<string, string | number>>>(
        `${REPORTS_BASE}/getOffice365ActiveUserCounts(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'office365')
    },

    async getOneDriveUsage(period: ReportPeriod) {
      const res = await graph.get<JsonReport<Record<string, string | number>>>(
        `${REPORTS_BASE}/getOneDriveUsageStorage(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'storageUsedInBytes')
    },

    async getTeamsActivity(period: ReportPeriod) {
      // 'teamChatMessages' = channel messages posted per day.
      const res = await graph.get<JsonReport<Record<string, string | number>>>(
        `${REPORTS_BASE}/getTeamsUserActivityCounts(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'teamChatMessages')
    },

    async getMailbox(period: ReportPeriod) {
      const [counts, storage] = await Promise.all([
        graph.get<JsonReport<RawMailboxRow>>(
          `${REPORTS_BASE}/getMailboxUsageMailboxCounts(period='${period}')?$format=application/json`,
        ),
        graph.get<JsonReport<RawMailboxStorageRow>>(
          `${REPORTS_BASE}/getMailboxUsageStorage(period='${period}')?$format=application/json`,
        ),
      ])
      return parseMailboxSummary(counts.value, parseMailboxStorage(storage.value))
    },

    async getEmailActivity(period: ReportPeriod) {
      const res = await graph.get<JsonReport<RawEmailRow>>(
        `${REPORTS_BASE}/getEmailActivityCounts(period='${period}')?$format=application/json`,
      )
      return parseEmailActivity(res.value)
    },

    async getAzureSubscriptions() {
      const res = await arm.get<{
        value: { subscriptionId: string; displayName: string; state: string }[]
      }>('/subscriptions', '2020-01-01')
      return parseSubscriptions(res)
    },

    async getAzureResourceCounts(subId: string) {
      const resources = await arm.getAllPages<{ type: string }>(
        `/subscriptions/${subId}/resources`,
      )
      return parseResourceCounts({ value: resources })
    },

    async getAzureCost(subId: string) {
      const res = await arm.post<RawCostQuery>(
        `/subscriptions/${subId}/providers/Microsoft.CostManagement/query`,
        costBody,
        '2023-11-01',
      )
      return parseCostQuery(res, subId)
    },
  }
}
