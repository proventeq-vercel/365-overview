import type {
  DailySharingCounts,
  GuestAccount,
  GuestInvitePolicy,
  OrgInfo,
  ReportSettings,
  SiteRow,
  TenantSharingSettings,
  UnifiedGroup,
  UserSharingActivity,
} from '../types/oversharing'

export interface SiteUsageReport {
  reportRefreshDate: string | null
  sites: SiteRow[]
}

export interface DataSource {
  getOrganization(): Promise<OrgInfo>
  getReportSettings(): Promise<ReportSettings>
  getSiteUsage(): Promise<SiteUsageReport>
  getSharePointActivity(): Promise<UserSharingActivity[]>
  getOneDriveActivity(): Promise<UserSharingActivity[]>
  getSharePointFileCounts(): Promise<DailySharingCounts[]>
  getOneDriveFileCounts(): Promise<DailySharingCounts[]>
  getGuests(): Promise<GuestAccount[]>
  getUnifiedGroups(): Promise<UnifiedGroup[]>
  getTenantSharingSettings(): Promise<TenantSharingSettings>
  getGuestInvitePolicy(): Promise<GuestInvitePolicy>
  getGlobalAdminCount(): Promise<number | null>
}
