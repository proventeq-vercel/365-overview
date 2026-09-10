import { describe, expect, it } from 'vitest'
import { buildOversharingOverview } from './oversharingOverview'
import { group, guest, noInputs, sharer, siteRow } from './fixtureBuilders'
import type { OrgInfo } from '../types/oversharing'

const CONTOSO: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomains: ['contoso.com', 'contoso.onmicrosoft.com'],
}

const NOW = new Date('2026-09-10T09:00:00Z')

describe('buildOversharingOverview — nothing readable', () => {
  it('nulls every figure rather than reporting zeroes', () => {
    const overview = buildOversharingOverview(noInputs(), NOW)
    expect(overview.scope).toBeNull()
    expect(overview.links).toBeNull()
    expect(overview.risk).toBeNull()
    expect(overview.sites).toBeNull()
    expect(overview.audience).toBeNull()
    expect(overview.posture).toBeNull()
    expect(overview.guestPolicy).toBeNull()
    expect(overview.globalAdmins).toBeNull()
    expect(overview.external.guests).toBeNull()
    expect(overview.external.topDomains).toBeNull()
    expect(overview.external.trend).toBeNull()
    expect(overview.external.topSharers).toBeNull()
    expect(overview.external.sitesExternalWithoutLabel).toBeNull()
    expect(Object.values(overview.cards).every((card) => card === null)).toBe(true)
  })

  it('carries the unavailable list through untouched', () => {
    const unavailable = [{ section: 'sharingPosture' as const, reason: 'role' as const }]
    expect(buildOversharingOverview(noInputs({ unavailable }), NOW).unavailable).toEqual(unavailable)
  })
})

describe('buildOversharingOverview — an empty tenant', () => {
  it('reports zero links over zero sites without dividing by zero', () => {
    const overview = buildOversharingOverview(noInputs({ siteUsage: [] }), NOW)
    expect(overview.scope).toEqual({ sites: 0, files: 0, groupConnectedSites: 0 })
    expect(overview.links).toEqual({ anonymous: 0, organization: 0, guest: 0, member: 0 })
    expect(overview.cards.anyoneLinks).toEqual({
      count: 0,
      affectedItems: 0,
      totalItems: 0,
      coverage: 0,
      severity: 'none',
    })
  })
})

describe('buildOversharingOverview — links and risk', () => {
  const sites = [
    siteRow({ siteId: 'a', anonymousLinks: 10, organizationLinks: 4, guestLinks: 2, memberLinks: 1 }),
    siteRow({ siteId: 'b', anonymousLinks: 0, organizationLinks: 7, guestLinks: 0, memberLinks: 3 }),
    siteRow({ siteId: 'c', isGroupConnected: true, fileCount: 50 }),
    siteRow({ siteId: 'gone', anonymousLinks: 999, isDeleted: true }),
  ]

  const overview = buildOversharingOverview(noInputs({ siteUsage: sites, organization: CONTOSO }), NOW)

  it('excludes deleted sites from every total', () => {
    expect(overview.scope).toEqual({ sites: 3, files: 250, groupConnectedSites: 1 })
    expect(overview.links?.anonymous).toBe(10)
    expect(overview.sites?.map((s) => s.siteId)).toEqual(['a', 'b', 'c'])
  })

  it('maps the three P365 risk bands onto link kinds', () => {
    expect(overview.risk).toEqual({ high: 10, medium: 11, lower: 2 })
  })

  it('grades a card by the share of sites it touches, not by the raw count', () => {
    expect(overview.cards.anyoneLinks).toEqual({
      count: 10,
      affectedItems: 1,
      totalItems: 3,
      coverage: 1 / 3,
      severity: 'action',
    })
  })

  it('counts forwardable links as anyone plus organisation-wide', () => {
    expect(overview.cards.forwardableLinks?.count).toBe(21)
    expect(overview.cards.forwardableLinks?.affectedItems).toBe(2)
  })

  it('leaves the public-groups card null when the directory could not be read', () => {
    expect(overview.cards.publicGroups).toBeNull()
  })
})

describe('buildOversharingOverview — most-shared sites', () => {
  it('counts a site as heavily shared at a quarter of a link per file', () => {
    const overview = buildOversharingOverview(
      noInputs({
        siteUsage: [
          siteRow({ siteId: 'just-under', linksPerFile: 0.249 }),
          siteRow({ siteId: 'at-threshold', linksPerFile: 0.25 }),
          siteRow({ siteId: 'over', linksPerFile: 4 }),
        ],
      }),
      NOW,
    )
    expect(overview.cards.mostSharedSites?.count).toBe(2)
  })

  it('never counts an empty site, whose links-per-file is unknowable', () => {
    const overview = buildOversharingOverview(
      noInputs({ siteUsage: [siteRow({ fileCount: 0, linksPerFile: null, anonymousLinks: 50 })] }),
      NOW,
    )
    expect(overview.cards.mostSharedSites?.count).toBe(0)
    expect(overview.cards.anyoneLinks?.count).toBe(50)
  })
})

describe('buildOversharingOverview — external access', () => {
  const guests = [
    guest({ id: '1', mail: 'a@fabrikam.com' }),
    guest({ id: '2', mail: 'b@fabrikam.com' }),
    guest({ id: '3', mail: 'c@northwind.com', externalUserState: 'PendingAcceptance' }),
    guest({ id: '4', mail: 'd@contoso.com' }),
    guest({ id: '5', mail: null, userPrincipalName: 'opaque', accountEnabled: false }),
  ]
  const overview = buildOversharingOverview(noInputs({ guests, organization: CONTOSO }), NOW)

  it('counts guests, pending invitations and disabled accounts separately', () => {
    expect(overview.external.guests).toEqual({ total: 5, pending: 1, disabled: 1, unattributed: 1 })
  })

  it('excludes a guest on a verified domain from the external domain breakdown', () => {
    expect(overview.external.topDomains).toEqual([
      { domain: 'fabrikam.com', guests: 2 },
      { domain: 'northwind.com', guests: 1 },
    ])
    expect(overview.external.externalDomainCount).toBe(2)
  })

  it('counts only the guest Graph gave no address for as unattributed', () => {
    expect(overview.external.guests?.unattributed).toBe(1)
  })

  it('does not call a guest on a verified domain unattributed just because it is not external', () => {
    const internalOnly = buildOversharingOverview(
      noInputs({ guests: [guest({ id: '1', mail: 'staff@contoso.com' })], organization: CONTOSO }),
      NOW,
    )
    expect(internalOnly.external.guests?.unattributed).toBe(0)
    expect(internalOnly.external.topDomains).toEqual([])
  })
})

describe('buildOversharingOverview — sharers and trend', () => {
  it('merges a person who shares from both SharePoint and OneDrive into one row', () => {
    const overview = buildOversharingOverview(
      noInputs({
        sharePointActivity: [sharer({ userPrincipalName: 'ada@contoso.com', sharedExternally: 12 })],
        oneDriveActivity: [sharer({ userPrincipalName: 'ada@contoso.com', sharedExternally: 5 })],
      }),
      NOW,
    )
    expect(overview.external.topSharers).toEqual([
      { userPrincipalName: 'ada@contoso.com', sharePoint: 12, oneDrive: 5, total: 17 },
    ])
  })

  it('leaves out people who shared nothing externally', () => {
    const overview = buildOversharingOverview(
      noInputs({
        sharePointActivity: [
          sharer({ userPrincipalName: 'ada@contoso.com', sharedExternally: 3 }),
          sharer({ userPrincipalName: 'grace@contoso.com', sharedInternally: 40, sharedExternally: 0 }),
        ],
      }),
      NOW,
    )
    expect(overview.external.topSharers?.map((s) => s.userPrincipalName)).toEqual(['ada@contoso.com'])
  })

  it('is null when neither activity report could be read', () => {
    expect(buildOversharingOverview(noInputs(), NOW).external.topSharers).toBeNull()
  })

  it('is an empty list, not null, when the reports were read and nobody shared', () => {
    const overview = buildOversharingOverview(noInputs({ sharePointActivity: [] }), NOW)
    expect(overview.external.topSharers).toEqual([])
  })

  it('sums the two services per day and returns the series in date order', () => {
    const overview = buildOversharingOverview(
      noInputs({
        sharePointFileCounts: [
          { date: '2026-09-02', sharedInternally: 0, sharedExternally: 7 },
          { date: '2026-09-01', sharedInternally: 0, sharedExternally: 3 },
        ],
        oneDriveFileCounts: [{ date: '2026-09-02', sharedInternally: 0, sharedExternally: 4 }],
      }),
      NOW,
    )
    expect(overview.external.trend).toEqual([
      { date: '2026-09-01', sharePoint: 3, oneDrive: 0 },
      { date: '2026-09-02', sharePoint: 7, oneDrive: 4 },
    ])
    expect(overview.external.trendDays).toBe(2)
  })
})

describe('buildOversharingOverview — sites shareable without a label', () => {
  it('counts only sites that can be shared externally and carry no sensitivity label', () => {
    const overview = buildOversharingOverview(
      noInputs({
        siteUsage: [
          siteRow({ siteId: 'exposed', externalSharingEnabled: true, sensitivityLabelId: null }),
          siteRow({ siteId: 'labelled', externalSharingEnabled: true, sensitivityLabelId: 'label' }),
          siteRow({ siteId: 'internal', externalSharingEnabled: false, sensitivityLabelId: null }),
        ],
      }),
      NOW,
    )
    expect(overview.external.sitesExternalWithoutLabel).toBe(1)
  })
})

describe('buildOversharingOverview — groups', () => {
  it('grades public groups against all groups, not against sites', () => {
    const overview = buildOversharingOverview(
      noInputs({
        siteUsage: [siteRow({ siteId: 'a' }), siteRow({ siteId: 'b' })],
        groups: [
          group({ id: '1', isPublic: true }),
          group({ id: '2', isPublic: true }),
          group({ id: '3', isPublic: false }),
          group({ id: '4', isPublic: false }),
        ],
      }),
      NOW,
    )
    expect(overview.audience).toEqual({ publicGroups: 2, privateGroups: 2, totalGroups: 4 })
    expect(overview.cards.publicGroups).toEqual({
      count: 2,
      affectedItems: 2,
      totalItems: 4,
      coverage: 0.5,
      severity: 'action',
    })
  })
})

describe('buildOversharingOverview — caveats', () => {
  it('reports concealed names only when the tenant setting says so', () => {
    expect(buildOversharingOverview(noInputs(), NOW).caveats.namesAreConcealed).toBe(false)
    expect(
      buildOversharingOverview(noInputs({ reportSettings: { displayConcealedNames: false } }), NOW).caveats
        .namesAreConcealed,
    ).toBe(false)
    expect(
      buildOversharingOverview(noInputs({ reportSettings: { displayConcealedNames: true } }), NOW).caveats
        .namesAreConcealed,
    ).toBe(true)
  })

  it('measures the report lag from the refresh date', () => {
    expect(
      buildOversharingOverview(noInputs({ reportRefreshDate: '2026-09-07' }), NOW).caveats.reportLagDays,
    ).toBe(3)
  })

  it('leaves the lag null when there is no refresh date or it cannot be read', () => {
    expect(buildOversharingOverview(noInputs(), NOW).caveats.reportLagDays).toBeNull()
    expect(
      buildOversharingOverview(noInputs({ reportRefreshDate: 'not-a-date' }), NOW).caveats.reportLagDays,
    ).toBeNull()
  })

  it('never reports a negative lag from a refresh date in the future', () => {
    expect(
      buildOversharingOverview(noInputs({ reportRefreshDate: '2026-12-01' }), NOW).caveats.reportLagDays,
    ).toBeNull()
  })

  it('always states that the counts are links', () => {
    expect(buildOversharingOverview(noInputs(), NOW).caveats.countsAreLinksNotFiles).toBe(true)
  })
})

describe('buildOversharingOverview — a locked-down tenant', () => {
  it('reports no exposure without claiming the data was missing', () => {
    const overview = buildOversharingOverview(
      noInputs({
        organization: CONTOSO,
        siteUsage: [siteRow({ siteId: 'a' }), siteRow({ siteId: 'b' })],
        guests: [],
        groups: [group({ isPublic: false })],
        tenantSharing: {
          sharingCapability: 'disabled',
          sharingDomainRestrictionMode: 'none',
          allowedDomains: [],
          blockedDomains: [],
          isResharingByExternalUsersEnabled: false,
          isRequireAcceptingUserToMatchInvitedUserEnabled: true,
          isLegacyAuthProtocolsEnabled: false,
          isUnmanagedSyncAppForTenantRestricted: true,
        },
      }),
      NOW,
    )
    expect(overview.risk).toEqual({ high: 0, medium: 0, lower: 0 })
    expect(overview.cards.anyoneLinks?.severity).toBe('none')
    expect(overview.cards.publicGroups?.severity).toBe('none')
    expect(overview.external.guests).toEqual({ total: 0, pending: 0, disabled: 0, unattributed: 0 })
    expect(overview.posture?.sharingCapability).toBe('disabled')
    expect(overview.unavailable).toEqual([])
  })
})
