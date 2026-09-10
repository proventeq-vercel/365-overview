import type {
  DomainRestrictionMode,
  GuestInvitePolicy,
  GuestInviterScope,
  GuestUserRole,
  ReportSettings,
  SharingCapability,
  TenantSharingSettings,
} from '../types/oversharing'
import { text } from './graphValues'

export interface RawSharePointSettings {
  sharingCapability?: string
  sharingDomainRestrictionMode?: string
  sharingAllowedDomainList?: string[]
  sharingBlockedDomainList?: string[]
  isResharingByExternalUsersEnabled?: boolean
  isRequireAcceptingUserToMatchInvitedUserEnabled?: boolean
  isLegacyAuthProtocolsEnabled?: boolean
  isUnmanagedSyncAppForTenantRestricted?: boolean
}

export interface RawAuthorizationPolicy {
  allowInvitesFrom?: string
  guestUserRoleId?: string
}

export interface RawReportSettings {
  displayConcealedNames?: boolean
}

const SHARING_CAPABILITIES: SharingCapability[] = [
  'disabled',
  'externalUserSharingOnly',
  'externalUserAndGuestSharing',
  'existingExternalUserSharingOnly',
]

const RESTRICTION_MODES: DomainRestrictionMode[] = ['none', 'allowList', 'blockList']

const INVITER_SCOPES: GuestInviterScope[] = [
  'none',
  'adminsAndGuestInviters',
  'adminsGuestInvitersAndAllMembers',
  'everyone',
]

export const GUEST_ROLE_TEMPLATE_IDS: Record<string, GuestUserRole> = {
  'a0b1b346-4d3e-4e8b-98f8-753987be4970': 'sameAsMember',
  '10dae51f-b6af-4016-8d66-8c2a99b929b3': 'guest',
  '2af84b1e-32c8-42b7-82bc-daa82404023b': 'restrictedGuest',
}

function oneOf<T extends string>(value: unknown, allowed: T[]): T | 'unknown' {
  const raw = text(value).trim().toLowerCase()
  return allowed.find((option) => option.toLowerCase() === raw) ?? 'unknown'
}

export function parseSharePointSettings(raw: RawSharePointSettings | undefined): TenantSharingSettings {
  return {
    sharingCapability: oneOf(raw?.sharingCapability, SHARING_CAPABILITIES),
    sharingDomainRestrictionMode: oneOf(raw?.sharingDomainRestrictionMode, RESTRICTION_MODES),
    allowedDomains: raw?.sharingAllowedDomainList ?? [],
    blockedDomains: raw?.sharingBlockedDomainList ?? [],
    isResharingByExternalUsersEnabled: raw?.isResharingByExternalUsersEnabled === true,
    isRequireAcceptingUserToMatchInvitedUserEnabled:
      raw?.isRequireAcceptingUserToMatchInvitedUserEnabled === true,
    isLegacyAuthProtocolsEnabled: raw?.isLegacyAuthProtocolsEnabled === true,
    isUnmanagedSyncAppForTenantRestricted: raw?.isUnmanagedSyncAppForTenantRestricted === true,
  }
}

export function parseAuthorizationPolicy(raw: RawAuthorizationPolicy | undefined): GuestInvitePolicy {
  return {
    allowInvitesFrom: oneOf(raw?.allowInvitesFrom, INVITER_SCOPES),
    guestUserRole: GUEST_ROLE_TEMPLATE_IDS[text(raw?.guestUserRoleId).trim().toLowerCase()] ?? 'unknown',
  }
}

export function parseReportSettings(raw: RawReportSettings | undefined): ReportSettings {
  return { displayConcealedNames: raw?.displayConcealedNames === true }
}
