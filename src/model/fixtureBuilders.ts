import type {
  GuestAccount,
  OversharingInputs,
  SiteRow,
  UnifiedGroup,
  UserSharingActivity,
} from '../types/oversharing'

export function siteRow(overrides: Partial<SiteRow> = {}): SiteRow {
  return {
    siteId: 'site',
    siteUrl: 'https://contoso.sharepoint.com/sites/site',
    template: 'STS',
    isGroupConnected: false,
    ownerDisplayName: 'Ada Lovelace',
    ownerPrincipalName: 'ada@contoso.com',
    fileCount: 100,
    activeFileCount: 40,
    lastActivityDate: '2026-09-01',
    isDeleted: false,
    anonymousLinks: 0,
    organizationLinks: 0,
    guestLinks: 0,
    memberLinks: 0,
    externalSharingEnabled: false,
    sensitivityLabelId: 'label',
    unmanagedDevicePolicy: 'AllowFullAccess',
    linksPerFile: 0,
    ...overrides,
  }
}

export function guest(overrides: Partial<GuestAccount> = {}): GuestAccount {
  return {
    id: 'guest',
    mail: 'ada@fabrikam.com',
    userPrincipalName: 'ada_fabrikam.com#EXT#@contoso.onmicrosoft.com',
    externalUserState: 'Accepted',
    accountEnabled: true,
    ...overrides,
  }
}

export function group(overrides: Partial<UnifiedGroup> = {}): UnifiedGroup {
  return { id: 'group', displayName: 'Group', isPublic: false, ...overrides }
}

export function sharer(overrides: Partial<UserSharingActivity> = {}): UserSharingActivity {
  return {
    userPrincipalName: 'ada@contoso.com',
    sharedInternally: 0,
    sharedExternally: 0,
    lastActivityDate: '2026-09-01',
    isDeleted: false,
    ...overrides,
  }
}

export function noInputs(overrides: Partial<OversharingInputs> = {}): OversharingInputs {
  return {
    organization: null,
    reportSettings: null,
    reportRefreshDate: null,
    siteUsage: null,
    sharePointActivity: null,
    oneDriveActivity: null,
    sharePointFileCounts: null,
    oneDriveFileCounts: null,
    guests: null,
    groups: null,
    tenantSharing: null,
    guestPolicy: null,
    globalAdmins: null,
    unavailable: [],
    ...overrides,
  }
}
