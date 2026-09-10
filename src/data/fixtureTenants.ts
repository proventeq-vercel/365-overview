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
import type { SiteUsageReport } from './dataSource'

export const FIXTURE_TENANT_KEYS = ['exposed', 'locked-down', 'concealed', 'reports-reader'] as const

export type FixtureTenantKey = (typeof FIXTURE_TENANT_KEYS)[number]

export const DEFAULT_FIXTURE_TENANT: FixtureTenantKey = 'exposed'

export const FIXTURE_REFRESH_DATE = '2026-09-07'

export interface FixtureTenant {
  key: FixtureTenantKey
  label: string
  organization: OrgInfo
  reportSettings: ReportSettings
  siteUsage: SiteUsageReport
  sharePointActivity: UserSharingActivity[]
  oneDriveActivity: UserSharingActivity[]
  sharePointFileCounts: DailySharingCounts[]
  oneDriveFileCounts: DailySharingCounts[]
  guests: GuestAccount[]
  groups: UnifiedGroup[]
  tenantSharing: TenantSharingSettings
  guestPolicy: GuestInvitePolicy
  globalAdmins: number | null
  forbidden: string[]
}

export function isFixtureTenantKey(value: string | null): value is FixtureTenantKey {
  return value !== null && (FIXTURE_TENANT_KEYS as readonly string[]).includes(value)
}

const CONTOSO: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomains: ['contoso.com', 'contoso.onmicrosoft.com'],
}

const OPEN_POSTURE: TenantSharingSettings = {
  sharingCapability: 'externalUserAndGuestSharing',
  sharingDomainRestrictionMode: 'none',
  allowedDomains: [],
  blockedDomains: [],
  isResharingByExternalUsersEnabled: true,
  isRequireAcceptingUserToMatchInvitedUserEnabled: false,
  isLegacyAuthProtocolsEnabled: true,
  isUnmanagedSyncAppForTenantRestricted: false,
}

const CLOSED_POSTURE: TenantSharingSettings = {
  sharingCapability: 'disabled',
  sharingDomainRestrictionMode: 'allowList',
  allowedDomains: ['fabrikam.com'],
  blockedDomains: [],
  isResharingByExternalUsersEnabled: false,
  isRequireAcceptingUserToMatchInvitedUserEnabled: true,
  isLegacyAuthProtocolsEnabled: false,
  isUnmanagedSyncAppForTenantRestricted: true,
}

const OPEN_INVITES: GuestInvitePolicy = { allowInvitesFrom: 'everyone', guestUserRole: 'sameAsMember' }
const CLOSED_INVITES: GuestInvitePolicy = {
  allowInvitesFrom: 'adminsAndGuestInviters',
  guestUserRole: 'restrictedGuest',
}

const DEPARTMENTS = [
  'Marketing', 'Finance', 'Legal', 'Sales', 'Engineering', 'Support', 'People', 'Design',
  'Research', 'Operations', 'Procurement', 'Facilities',
]

const OWNERS = [
  ['Ada Lovelace', 'ada@contoso.com'],
  ['Grace Hopper', 'grace@contoso.com'],
  ['Alan Turing', 'alan@contoso.com'],
  ['Katherine Johnson', 'katherine@contoso.com'],
]

const DEVICE_POLICIES = ['AllowFullAccess', 'AllowLimitedAccess', 'BlockAccess']

function pseudoRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

interface SiteGenerationOptions {
  count: number
  exposureRate: number
  conceal: boolean
}

function concealed(value: string, index: number): string {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) % 0xffffffff
  return `${(hash + index).toString(16).toUpperCase().padStart(10, '0')}`
}

export function generateSites({ count, exposureRate, conceal }: SiteGenerationOptions): SiteRow[] {
  const random = pseudoRandom(20260907)
  const sites: SiteRow[] = []
  for (let index = 0; index < count; index += 1) {
    const department = DEPARTMENTS[index % DEPARTMENTS.length]
    const [ownerDisplayName, ownerPrincipalName] = OWNERS[index % OWNERS.length]
    const isGroupConnected = index % 3 === 0
    const fileCount = Math.round(random() * 4000)
    const exposed = random() < exposureRate
    const anonymousLinks = exposed ? Math.round(random() * 60) : 0
    const organizationLinks = exposed ? Math.round(random() * 120) : Math.round(random() * 4)
    const guestLinks = exposed ? Math.round(random() * 40) : 0
    const memberLinks = Math.round(random() * 200)
    const totalLinks = anonymousLinks + organizationLinks + guestLinks + memberLinks
    const url = `https://contoso.sharepoint.com/sites/${department.toLowerCase()}-${index}`
    sites.push({
      siteId: `site-${index}`,
      siteUrl: conceal ? concealed(url, index) : url,
      template: isGroupConnected ? 'Group' : 'STS',
      isGroupConnected,
      ownerDisplayName: conceal ? concealed(ownerDisplayName, index) : ownerDisplayName,
      ownerPrincipalName: conceal ? concealed(ownerPrincipalName, index) : ownerPrincipalName,
      fileCount,
      activeFileCount: Math.round(fileCount * random()),
      lastActivityDate: random() < 0.1 ? null : '2026-09-05',
      isDeleted: false,
      anonymousLinks,
      organizationLinks,
      guestLinks,
      memberLinks,
      externalSharingEnabled: exposed || random() < 0.4,
      sensitivityLabelId: random() < 0.55 ? 'b7b8f1e0-1f2a-4c3d-9e5f-6a7b8c9d0e1f' : null,
      unmanagedDevicePolicy: DEVICE_POLICIES[index % DEVICE_POLICIES.length],
      linksPerFile: fileCount > 0 ? totalLinks / fileCount : null,
    })
  }
  return sites
}

const EXTERNAL_DOMAINS = [
  'fabrikam.com', 'northwind.com', 'adventure-works.com', 'tailspintoys.com',
  'wideworldimporters.com', 'proseware.com', 'lucernepublishing.com', 'litwareinc.com',
  'consolidatedmessenger.com', 'graphicdesigninstitute.com',
]

function generateGuests(count: number): GuestAccount[] {
  const random = pseudoRandom(4242)
  return Array.from({ length: count }, (_, index) => {
    const domain = EXTERNAL_DOMAINS[Math.floor(random() * EXTERNAL_DOMAINS.length)]
    const roll = random()
    return {
      id: `guest-${index}`,
      mail: `person${index}@${domain}`,
      userPrincipalName: `person${index}_${domain}#EXT#@contoso.onmicrosoft.com`,
      externalUserState: roll < 0.18 ? 'PendingAcceptance' : 'Accepted',
      accountEnabled: roll >= 0.06,
    }
  })
}

function generateGroups(count: number, publicShare: number): UnifiedGroup[] {
  const random = pseudoRandom(77)
  return Array.from({ length: count }, (_, index) => ({
    id: `group-${index}`,
    displayName: `${DEPARTMENTS[index % DEPARTMENTS.length]} Team ${index}`,
    isPublic: random() < publicShare,
  }))
}

function generateSharers(count: number, scale: number): UserSharingActivity[] {
  const random = pseudoRandom(909)
  return Array.from({ length: count }, (_, index) => ({
    userPrincipalName: `person${index}@contoso.com`,
    sharedInternally: Math.round(random() * scale * 3),
    sharedExternally: Math.round(random() * scale),
    lastActivityDate: '2026-09-05',
    isDeleted: false,
  }))
}

function generateDailyCounts(days: number, scale: number): DailySharingCounts[] {
  const random = pseudoRandom(1717)
  const end = Date.parse(FIXTURE_REFRESH_DATE)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - 1 - index) * 86400000).toISOString().slice(0, 10)
    const weekday = new Date(date).getUTCDay()
    const workday = weekday !== 0 && weekday !== 6 ? 1 : 0.25
    return {
      date,
      sharedInternally: Math.round(random() * scale * 3 * workday),
      sharedExternally: Math.round(random() * scale * workday),
    }
  })
}

export const FIXTURE_TENANTS: Record<FixtureTenantKey, FixtureTenant> = {
  exposed: {
    key: 'exposed',
    label: 'Exposed tenant',
    organization: CONTOSO,
    reportSettings: { displayConcealedNames: false },
    siteUsage: {
      reportRefreshDate: FIXTURE_REFRESH_DATE,
      sites: generateSites({ count: 2500, exposureRate: 0.12, conceal: false }),
    },
    sharePointActivity: generateSharers(400, 30),
    oneDriveActivity: generateSharers(400, 12),
    sharePointFileCounts: generateDailyCounts(180, 40),
    oneDriveFileCounts: generateDailyCounts(180, 18),
    guests: generateGuests(340),
    groups: generateGroups(220, 0.28),
    tenantSharing: OPEN_POSTURE,
    guestPolicy: OPEN_INVITES,
    globalAdmins: 9,
    forbidden: [],
  },

  'locked-down': {
    key: 'locked-down',
    label: 'Locked-down tenant',
    organization: CONTOSO,
    reportSettings: { displayConcealedNames: false },
    siteUsage: {
      reportRefreshDate: FIXTURE_REFRESH_DATE,
      sites: generateSites({ count: 180, exposureRate: 0, conceal: false }).map((site) => ({
        ...site,
        anonymousLinks: 0,
        organizationLinks: 0,
        guestLinks: 0,
        externalSharingEnabled: false,
        sensitivityLabelId: 'b7b8f1e0-1f2a-4c3d-9e5f-6a7b8c9d0e1f',
        linksPerFile: site.fileCount > 0 ? site.memberLinks / site.fileCount : null,
      })),
    },
    sharePointActivity: generateSharers(60, 0),
    oneDriveActivity: generateSharers(60, 0),
    sharePointFileCounts: generateDailyCounts(180, 0),
    oneDriveFileCounts: generateDailyCounts(180, 0),
    guests: [],
    groups: generateGroups(40, 0),
    tenantSharing: CLOSED_POSTURE,
    guestPolicy: CLOSED_INVITES,
    globalAdmins: 3,
    forbidden: [],
  },

  concealed: {
    key: 'concealed',
    label: 'Concealed names',
    organization: CONTOSO,
    reportSettings: { displayConcealedNames: true },
    siteUsage: {
      reportRefreshDate: FIXTURE_REFRESH_DATE,
      sites: generateSites({ count: 900, exposureRate: 0.09, conceal: true }),
    },
    sharePointActivity: generateSharers(200, 24).map((user, index) => ({
      ...user,
      userPrincipalName: concealed(user.userPrincipalName, index),
    })),
    oneDriveActivity: generateSharers(200, 9).map((user, index) => ({
      ...user,
      userPrincipalName: concealed(user.userPrincipalName, index),
    })),
    sharePointFileCounts: generateDailyCounts(180, 26),
    oneDriveFileCounts: generateDailyCounts(180, 11),
    guests: generateGuests(120),
    groups: generateGroups(80, 0.2),
    tenantSharing: OPEN_POSTURE,
    guestPolicy: OPEN_INVITES,
    globalAdmins: 5,
    forbidden: [],
  },

  'reports-reader': {
    key: 'reports-reader',
    label: 'Reports Reader (no posture)',
    organization: CONTOSO,
    reportSettings: { displayConcealedNames: false },
    siteUsage: {
      reportRefreshDate: FIXTURE_REFRESH_DATE,
      sites: generateSites({ count: 640, exposureRate: 0.1, conceal: false }),
    },
    sharePointActivity: generateSharers(150, 20),
    oneDriveActivity: generateSharers(150, 8),
    sharePointFileCounts: generateDailyCounts(180, 22),
    oneDriveFileCounts: generateDailyCounts(180, 9),
    guests: generateGuests(90),
    groups: generateGroups(60, 0.22),
    tenantSharing: OPEN_POSTURE,
    guestPolicy: OPEN_INVITES,
    globalAdmins: null,
    forbidden: ['getTenantSharingSettings', 'getGuestInvitePolicy', 'getGlobalAdminCount'],
  },
}
