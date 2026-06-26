import type { ArmClient } from '../clients/armClient'
import type { GraphClient } from '../clients/graphClient'
import { parseResourceCounts, parseSubscriptions, parseCostQuery } from '../reports/azure'
import type { RawCostQuery } from '../reports/azure'
import { parseOrg, parseUsageCounts } from '../reports/estate'
import type { RawOrg } from '../reports/estate'
import { parseEmailActivity, parseMailboxSummary } from '../reports/exchange'
import type { RawEmailRow, RawMailboxRow } from '../reports/exchange'
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
      const res = await graph.get<JsonReport<RawSpoRow>>(
        `/reports/getSharePointSiteUsageDetail(period='${period}')?$format=application/json`,
      )
      return parseSharePointDetail(res.value)
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
      // Column 'Total' = combined active users across all M365 services.
      const res = await graph.get<JsonReport<Record<string, string>>>(
        `/reports/getOffice365ActiveUserCounts(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'Total')
    },

    async getOneDriveUsage(period: ReportPeriod) {
      const res = await graph.get<JsonReport<Record<string, string>>>(
        `/reports/getOneDriveUsageStorage(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'Storage Used (Byte)')
    },

    async getTeamsActivity(period: ReportPeriod) {
      // Column 'Team Chat Messages' = channel messages posted per day.
      const res = await graph.get<JsonReport<Record<string, string>>>(
        `/reports/getTeamsUserActivityCounts(period='${period}')?$format=application/json`,
      )
      return parseUsageCounts(res.value, 'Team Chat Messages')
    },

    async getMailbox(period: ReportPeriod) {
      const res = await graph.get<JsonReport<RawMailboxRow>>(
        `/reports/getMailboxUsageMailboxCounts(period='${period}')?$format=application/json`,
      )
      return parseMailboxSummary(res.value)
    },

    async getEmailActivity(period: ReportPeriod) {
      const res = await graph.get<JsonReport<RawEmailRow>>(
        `/reports/getEmailActivityCounts(period='${period}')?$format=application/json`,
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
      const res = await arm.get<{ value: { type: string }[] }>(
        `/subscriptions/${subId}/resources`,
      )
      return parseResourceCounts(res)
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
