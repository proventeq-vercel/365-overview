import { describe, expect, it } from 'vitest'
import { parseAuthorizationPolicy, parseReportSettings, parseSharePointSettings } from './tenantSettings'

describe('parseSharePointSettings', () => {
  it('reads the tenant sharing posture', () => {
    expect(
      parseSharePointSettings({
        sharingCapability: 'externalUserAndGuestSharing',
        sharingDomainRestrictionMode: 'blockList',
        sharingBlockedDomainList: ['competitor.com'],
        isResharingByExternalUsersEnabled: true,
        isRequireAcceptingUserToMatchInvitedUserEnabled: false,
        isLegacyAuthProtocolsEnabled: true,
        isUnmanagedSyncAppForTenantRestricted: false,
      }),
    ).toEqual({
      sharingCapability: 'externalUserAndGuestSharing',
      sharingDomainRestrictionMode: 'blockList',
      allowedDomains: [],
      blockedDomains: ['competitor.com'],
      isResharingByExternalUsersEnabled: true,
      isRequireAcceptingUserToMatchInvitedUserEnabled: false,
      isLegacyAuthProtocolsEnabled: true,
      isUnmanagedSyncAppForTenantRestricted: false,
    })
  })

  it('marks a capability it does not recognise as unknown rather than guessing a safe default', () => {
    const settings = parseSharePointSettings({ sharingCapability: 'somethingNew' })
    expect(settings.sharingCapability).toBe('unknown')
    expect(settings.sharingDomainRestrictionMode).toBe('unknown')
  })

  it('reports every boolean as false when the payload omits it', () => {
    const settings = parseSharePointSettings(undefined)
    expect(settings.isResharingByExternalUsersEnabled).toBe(false)
    expect(settings.isLegacyAuthProtocolsEnabled).toBe(false)
  })
})

describe('parseAuthorizationPolicy', () => {
  it('maps the three documented guest role template ids', () => {
    expect(
      parseAuthorizationPolicy({
        allowInvitesFrom: 'everyone',
        guestUserRoleId: 'a0b1b346-4d3e-4e8b-98f8-753987be4970',
      }),
    ).toEqual({ allowInvitesFrom: 'everyone', guestUserRole: 'sameAsMember' })

    expect(parseAuthorizationPolicy({ guestUserRoleId: '10dae51f-b6af-4016-8d66-8c2a99b929b3' }).guestUserRole).toBe(
      'guest',
    )
    expect(parseAuthorizationPolicy({ guestUserRoleId: '2af84b1e-32c8-42b7-82bc-daa82404023b' }).guestUserRole).toBe(
      'restrictedGuest',
    )
  })

  it('is case-insensitive about the role guid', () => {
    expect(parseAuthorizationPolicy({ guestUserRoleId: '2AF84B1E-32C8-42B7-82BC-DAA82404023B' }).guestUserRole).toBe(
      'restrictedGuest',
    )
  })

  it('does not invent a role for an unrecognised guid', () => {
    expect(parseAuthorizationPolicy({ guestUserRoleId: '00000000-0000-0000-0000-000000000000' }).guestUserRole).toBe(
      'unknown',
    )
    expect(parseAuthorizationPolicy(undefined)).toEqual({ allowInvitesFrom: 'unknown', guestUserRole: 'unknown' })
  })
})

describe('parseReportSettings', () => {
  it('reads the concealed-names switch exactly, without pattern matching', () => {
    expect(parseReportSettings({ displayConcealedNames: true })).toEqual({ displayConcealedNames: true })
    expect(parseReportSettings({ displayConcealedNames: false })).toEqual({ displayConcealedNames: false })
    expect(parseReportSettings(undefined)).toEqual({ displayConcealedNames: false })
  })
})
