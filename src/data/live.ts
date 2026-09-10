import type { GraphClient } from '../clients/graphClient'
import { parseActivityUsers, parseFileCounts } from '../reports/activity'
import type { RawActivityUserRow, RawFileCountsRow } from '../reports/activity'
import { parseGroups, parseGuests } from '../reports/directory'
import type { RawGroup, RawGuest } from '../reports/directory'
import { parseOrganization } from '../reports/organization'
import type { RawOrganization } from '../reports/organization'
import { parseSiteUsage, reportRefreshDateOf } from '../reports/siteUsage'
import type { RawSiteUsageRow } from '../reports/siteUsage'
import {
  parseAuthorizationPolicy,
  parseReportSettings,
  parseSharePointSettings,
} from '../reports/tenantSettings'
import type {
  RawAuthorizationPolicy,
  RawReportSettings,
  RawSharePointSettings,
} from '../reports/tenantSettings'
import type { DataSource } from './dataSource'

interface GraphCollection<T> {
  value: T[]
}

export const REPORTS_BASE = 'https://graph.microsoft.com/beta/reports'

export const REPORT_PERIOD = 'D180'

const JSON_FORMAT = '$format=application/json'

export const GLOBAL_ADMIN_ROLE_TEMPLATE_ID = '62e90394-69f5-4237-9190-012177145e10'

function reportUrl(fn: string): string {
  return `${REPORTS_BASE}/${fn}(period='${REPORT_PERIOD}')?${JSON_FORMAT}`
}

export function createLiveDataSource(graph: GraphClient): DataSource {
  return {
    async getOrganization() {
      const res = await graph.get<GraphCollection<RawOrganization>>('/organization')
      return parseOrganization(res.value[0])
    },

    async getReportSettings() {
      return parseReportSettings(await graph.get<RawReportSettings>('/admin/reportSettings'))
    },

    async getSiteUsage() {
      const rows = await graph.getAllPages<RawSiteUsageRow>(
        reportUrl('getSharePointSiteUsageDetail'),
      )
      return { reportRefreshDate: reportRefreshDateOf(rows), sites: parseSiteUsage(rows) }
    },

    async getSharePointActivity() {
      return parseActivityUsers(
        await graph.getAllPages<RawActivityUserRow>(reportUrl('getSharePointActivityUserDetail')),
      )
    },

    async getOneDriveActivity() {
      return parseActivityUsers(
        await graph.getAllPages<RawActivityUserRow>(reportUrl('getOneDriveActivityUserDetail')),
      )
    },

    async getSharePointFileCounts() {
      const res = await graph.get<GraphCollection<RawFileCountsRow>>(
        reportUrl('getSharePointActivityFileCounts'),
      )
      return parseFileCounts(res.value)
    },

    async getOneDriveFileCounts() {
      const res = await graph.get<GraphCollection<RawFileCountsRow>>(
        reportUrl('getOneDriveActivityFileCounts'),
      )
      return parseFileCounts(res.value)
    },

    async getGuests() {
      return parseGuests(
        await graph.getAllPages<RawGuest>(
          "/users?$filter=userType eq 'Guest'&$select=id,mail,userPrincipalName,externalUserState,accountEnabled&$top=999",
        ),
      )
    },

    async getUnifiedGroups() {
      return parseGroups(
        await graph.getAllPages<RawGroup>(
          "/groups?$filter=groupTypes/any(c:c eq 'Unified')&$select=id,displayName,visibility&$top=999",
        ),
      )
    },

    async getTenantSharingSettings() {
      return parseSharePointSettings(await graph.get<RawSharePointSettings>('/admin/sharepoint/settings'))
    },

    async getGuestInvitePolicy() {
      return parseAuthorizationPolicy(await graph.get<RawAuthorizationPolicy>('/policies/authorizationPolicy'))
    },

    async getGlobalAdminCount() {
      const roles = await graph.get<GraphCollection<{ id?: string }>>(
        `/directoryRoles?$filter=roleTemplateId eq '${GLOBAL_ADMIN_ROLE_TEMPLATE_ID}'`,
      )
      const roleId = roles.value[0]?.id
      if (!roleId) return null
      const members = await graph.getAllPages<{ id?: string }>(
        `/directoryRoles/${roleId}/members?$select=id&$top=999`,
      )
      return members.length
    },
  }
}
