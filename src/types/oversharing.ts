import type { Severity } from '../lib/severity'

export interface OrgInfo {
  displayName: string
  verifiedDomains: string[]
}

export type SectionKey =
  | 'links'
  | 'sharers'
  | 'trend'
  | 'guests'
  | 'groups'
  | 'sharingPosture'
  | 'guestPolicy'
  | 'globalAdmins'

export type UnavailableReason = 'consent' | 'role' | 'notInGraph' | 'unknown'

export interface Unavailable {
  section: SectionKey
  reason: UnavailableReason
}

export interface SiteRow {
  siteId: string
  siteUrl: string
  template: string
  isGroupConnected: boolean
  ownerDisplayName: string
  ownerPrincipalName: string
  fileCount: number
  activeFileCount: number
  lastActivityDate: string | null
  isDeleted: boolean
  anonymousLinks: number
  organizationLinks: number
  guestLinks: number
  memberLinks: number
  externalSharingEnabled: boolean
  sensitivityLabelId: string | null
  unmanagedDevicePolicy: string
  linksPerFile: number | null
}

export interface UserSharingActivity {
  userPrincipalName: string
  sharedInternally: number
  sharedExternally: number
  lastActivityDate: string | null
  isDeleted: boolean
}

export interface DailySharingCounts {
  date: string
  sharedInternally: number
  sharedExternally: number
}

export interface GuestAccount {
  id: string
  mail: string | null
  userPrincipalName: string | null
  externalUserState: string | null
  accountEnabled: boolean
}

export interface UnifiedGroup {
  id: string
  displayName: string
  isPublic: boolean
}

export type SharingCapability =
  | 'disabled'
  | 'externalUserSharingOnly'
  | 'externalUserAndGuestSharing'
  | 'existingExternalUserSharingOnly'
  | 'unknown'

export type DomainRestrictionMode = 'none' | 'allowList' | 'blockList' | 'unknown'

export interface TenantSharingSettings {
  sharingCapability: SharingCapability
  sharingDomainRestrictionMode: DomainRestrictionMode
  allowedDomains: string[]
  blockedDomains: string[]
  isResharingByExternalUsersEnabled: boolean
  isRequireAcceptingUserToMatchInvitedUserEnabled: boolean
  isLegacyAuthProtocolsEnabled: boolean
  isUnmanagedSyncAppForTenantRestricted: boolean
}

export type GuestInviterScope =
  | 'none'
  | 'adminsAndGuestInviters'
  | 'adminsGuestInvitersAndAllMembers'
  | 'everyone'
  | 'unknown'

export type GuestUserRole = 'sameAsMember' | 'guest' | 'restrictedGuest' | 'unknown'

export interface GuestInvitePolicy {
  allowInvitesFrom: GuestInviterScope
  guestUserRole: GuestUserRole
}

export interface ReportSettings {
  displayConcealedNames: boolean
}

export type CardKey =
  | 'anyoneLinks'
  | 'organizationLinks'
  | 'externalUserAccess'
  | 'forwardableLinks'
  | 'mostSharedSites'
  | 'publicGroups'

export interface CardStat {
  count: number
  affectedItems: number
  totalItems: number
  coverage: number
  severity: Severity
}

export interface DomainCount {
  domain: string
  guests: number
}

export interface SharerRow {
  userPrincipalName: string
  sharePoint: number
  oneDrive: number
  total: number
}

export interface TrendPoint {
  date: string
  sharePoint: number
  oneDrive: number
}

export interface LinkTotals {
  anonymous: number
  organization: number
  guest: number
  member: number
}

export interface RiskTotals {
  high: number
  medium: number
  lower: number
}

export interface ReportScope {
  sites: number
  files: number
  groupConnectedSites: number
}

export interface GuestTotals {
  total: number
  pending: number
  disabled: number
  unattributed: number
}

export interface GroupTotals {
  publicGroups: number
  privateGroups: number
  totalGroups: number
}

export interface ExternalAccess {
  guests: GuestTotals | null
  topDomains: DomainCount[] | null
  externalDomainCount: number | null
  trend: TrendPoint[] | null
  trendDays: number | null
  topSharers: SharerRow[] | null
  sitesExternalWithoutLabel: number | null
}

export interface Caveats {
  namesAreConcealed: boolean
  countsAreLinksNotFiles: true
  reportLagDays: number | null
}

export interface OversharingOverview {
  reportRefreshDate: string | null
  tenant: OrgInfo | null
  scope: ReportScope | null
  links: LinkTotals | null
  risk: RiskTotals | null
  cards: Record<CardKey, CardStat | null>
  sites: SiteRow[] | null
  external: ExternalAccess
  audience: GroupTotals | null
  posture: TenantSharingSettings | null
  guestPolicy: GuestInvitePolicy | null
  globalAdmins: number | null
  caveats: Caveats
  unavailable: Unavailable[]
}

export interface OversharingInputs {
  organization: OrgInfo | null
  reportSettings: ReportSettings | null
  siteUsage: SiteRow[] | null
  sharePointActivity: UserSharingActivity[] | null
  oneDriveActivity: UserSharingActivity[] | null
  sharePointFileCounts: DailySharingCounts[] | null
  oneDriveFileCounts: DailySharingCounts[] | null
  guests: GuestAccount[] | null
  groups: UnifiedGroup[] | null
  tenantSharing: TenantSharingSettings | null
  guestPolicy: GuestInvitePolicy | null
  globalAdmins: number | null
  unavailable: Unavailable[]
}
