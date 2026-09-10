import { PostureTile, type PostureTone } from '@/components/PostureTile'
import { formatNumber } from '@/lib/format'
import type {
  GuestInvitePolicy,
  OversharingOverview,
  TenantSharingSettings,
} from '@/types/oversharing'
import { SectionUnavailable } from './unavailableFor'

interface Tile {
  label: string
  value: string
  tone: PostureTone
  detail?: string
}

const SHARING_CAPABILITY_TILE: Record<TenantSharingSettings['sharingCapability'], Tile> = {
  disabled: { label: 'External sharing', value: 'Off', tone: 'good', detail: 'Nothing can be shared outside the tenant' },
  existingExternalUserSharingOnly: {
    label: 'External sharing',
    value: 'Existing guests only',
    tone: 'good',
    detail: 'New people cannot be invited to content',
  },
  externalUserSharingOnly: {
    label: 'External sharing',
    value: 'New and existing guests',
    tone: 'watch',
    detail: 'Guests must sign in; Anyone links are off',
  },
  externalUserAndGuestSharing: {
    label: 'External sharing',
    value: 'Anyone links allowed',
    tone: 'bad',
    detail: 'Links that need no sign-in can be created',
  },
  unknown: { label: 'External sharing', value: 'Not recognised', tone: 'neutral', detail: 'Graph returned a value this report does not know' },
}

const RESTRICTION_TILE: Record<TenantSharingSettings['sharingDomainRestrictionMode'], Tile> = {
  none: { label: 'Domain restriction', value: 'Any domain', tone: 'bad' },
  allowList: { label: 'Domain restriction', value: 'Allow list', tone: 'good' },
  blockList: { label: 'Domain restriction', value: 'Block list', tone: 'watch' },
  unknown: { label: 'Domain restriction', value: 'Not recognised', tone: 'neutral' },
}

const INVITER_TILE: Record<GuestInvitePolicy['allowInvitesFrom'], Tile> = {
  none: { label: 'Who can invite guests', value: 'Nobody', tone: 'good' },
  adminsAndGuestInviters: { label: 'Who can invite guests', value: 'Admins and guest inviters', tone: 'good' },
  adminsGuestInvitersAndAllMembers: {
    label: 'Who can invite guests',
    value: 'Any member',
    tone: 'watch',
  },
  everyone: { label: 'Who can invite guests', value: 'Everyone, guests included', tone: 'bad' },
  unknown: { label: 'Who can invite guests', value: 'Not recognised', tone: 'neutral' },
}

const GUEST_ROLE_TILE: Record<GuestInvitePolicy['guestUserRole'], Tile> = {
  sameAsMember: {
    label: 'Guest access level',
    value: 'Same as a member',
    tone: 'bad',
    detail: 'Guests can read the directory as any employee can',
  },
  guest: { label: 'Guest access level', value: 'Limited', tone: 'watch' },
  restrictedGuest: { label: 'Guest access level', value: 'Restricted', tone: 'good' },
  unknown: { label: 'Guest access level', value: 'Not recognised', tone: 'neutral' },
}

function yesNoTile(label: string, enabled: boolean, riskyWhen: boolean, detail?: string): Tile {
  return {
    label,
    value: enabled ? 'Enabled' : 'Disabled',
    tone: enabled === riskyWhen ? 'bad' : 'good',
    detail,
  }
}

interface SharingPostureProps {
  overview: OversharingOverview
  adminConsentUrl: string | null
}

export function SharingPosture({ overview, adminConsentUrl }: SharingPostureProps) {
  const { posture, guestPolicy, globalAdmins, unavailable } = overview

  const tiles: Tile[] = []
  if (posture !== null) {
    tiles.push(
      SHARING_CAPABILITY_TILE[posture.sharingCapability],
      {
        ...RESTRICTION_TILE[posture.sharingDomainRestrictionMode],
        detail:
          posture.sharingDomainRestrictionMode === 'allowList'
            ? `${formatNumber(posture.allowedDomains.length)} domains allowed`
            : posture.sharingDomainRestrictionMode === 'blockList'
              ? `${formatNumber(posture.blockedDomains.length)} domains blocked`
              : undefined,
      },
      yesNoTile('Guest resharing', posture.isResharingByExternalUsersEnabled, true, 'Guests passing your content on'),
      yesNoTile(
        'Invite must match address',
        posture.isRequireAcceptingUserToMatchInvitedUserEnabled,
        false,
        'Stops an invitation being redeemed by someone else',
      ),
      yesNoTile('Legacy authentication', posture.isLegacyAuthProtocolsEnabled, true),
      {
        label: 'Unmanaged devices',
        value: posture.isUnmanagedSyncAppForTenantRestricted ? 'Sync restricted' : 'Sync unrestricted',
        tone: posture.isUnmanagedSyncAppForTenantRestricted ? 'good' : 'bad',
        detail: 'Whether content can sync to devices your organisation does not manage',
      },
    )
  }
  if (guestPolicy !== null) {
    tiles.push(INVITER_TILE[guestPolicy.allowInvitesFrom], GUEST_ROLE_TILE[guestPolicy.guestUserRole])
  }
  if (globalAdmins !== null) {
    tiles.push({
      label: 'Global administrators',
      value: formatNumber(globalAdmins),
      tone: globalAdmins > 4 ? 'bad' : globalAdmins < 2 ? 'watch' : 'good',
      detail: 'Microsoft recommends between two and four',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {posture === null && (
        <SectionUnavailable entries={unavailable} section="sharingPosture" adminConsentUrl={adminConsentUrl} />
      )}
      {guestPolicy === null && (
        <SectionUnavailable entries={unavailable} section="guestPolicy" adminConsentUrl={adminConsentUrl} />
      )}
      {globalAdmins === null && (
        <SectionUnavailable entries={unavailable} section="globalAdmins" adminConsentUrl={adminConsentUrl} />
      )}
      {tiles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <PostureTile
              key={tile.label}
              label={tile.label}
              value={tile.value}
              tone={tile.tone}
              detail={tile.detail}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        These settings are read live from your tenant, not from a usage report, so they are current as of now.
      </p>
    </div>
  )
}
