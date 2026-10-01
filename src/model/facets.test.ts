import { describe, expect, it } from 'vitest'
import { buildOversharingOverview } from './oversharingOverview'
import { guest, noInputs, sharer, siteRow } from './fixtureBuilders'
import type { OrgInfo, SiteFacets } from '../types/oversharing'

const CONTOSO: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomains: ['contoso.com', 'contoso.onmicrosoft.com'],
}

const NOW = new Date('2026-09-10T09:00:00Z')

const SITES = [
  siteRow({ siteId: 'a', siteUrl: 'https://c.sharepoint.com/sites/a', anonymousLinks: 30 }),
  siteRow({
    siteId: 'b',
    siteUrl: 'https://c.sharepoint.com/sites/b',
    template: 'Communication Site',
    organizationLinks: 12,
    guestLinks: 4,
  }),
  siteRow({
    siteId: 'c',
    siteUrl: 'https://c.sharepoint.com/sites/c',
    template: 'Group',
    isGroupConnected: true,
    memberLinks: 900,
  }),
]

function facets(): SiteFacets {
  const overview = buildOversharingOverview(noInputs({ siteUsage: SITES }), NOW)
  if (overview.facets === null) throw new Error('expected facets')
  return overview.facets
}

describe('site facets', () => {
  it('is null when the site report could not be read', () => {
    expect(buildOversharingOverview(noInputs(), NOW).facets).toBeNull()
  })

  it('counts sites per audience, keeping a measured zero visible', () => {
    expect(facets().audience).toEqual([
      { id: 'anyone', name: 'Anyone with the link', count: 1 },
      { id: 'organization', name: 'Organisation-wide', count: 1 },
      { id: 'guest', name: 'Guest', count: 1 },
      { id: 'member', name: 'Members only', count: 1 },
    ])
  })

  it('ranks sites by broad links and leaves out those with none', () => {
    expect(facets().site).toEqual([
      { id: 'a', name: 'https://c.sharepoint.com/sites/a', count: 30 },
      { id: 'b', name: 'https://c.sharepoint.com/sites/b', count: 16 },
    ])
  })

  it('counts sites per type, most common first', () => {
    expect(facets().siteType).toEqual([
      { id: 'communication', name: 'Communication site', count: 1 },
      { id: 'groupConnected', name: 'Group-connected', count: 1 },
      { id: 'teamSite', name: 'Team site', count: 1 },
    ])
  })
})

describe('external facets', () => {
  it('is empty, not absent, when neither guests nor activity could be read', () => {
    const overview = buildOversharingOverview(noInputs(), NOW)
    expect(overview.external.facets).toEqual({ domain: [], sharer: [] })
  })

  it('counts guests per external domain and never lists a verified one', () => {
    const overview = buildOversharingOverview(
      noInputs({
        organization: CONTOSO,
        guests: [
          guest({ id: '1', mail: 'a@fabrikam.com' }),
          guest({ id: '2', mail: 'b@fabrikam.com' }),
          guest({ id: '3', mail: 'c@northwind.com' }),
          guest({ id: '4', mail: 'd@contoso.com' }),
        ],
      }),
      NOW,
    )
    expect(overview.external.facets.domain).toEqual([
      { id: 'fabrikam.com', name: 'fabrikam.com', count: 2 },
      { id: 'northwind.com', name: 'northwind.com', count: 1 },
    ])
  })

  it('ranks sharers by their combined external sharing', () => {
    const overview = buildOversharingOverview(
      noInputs({
        sharePointActivity: [
          sharer({ userPrincipalName: 'ada@contoso.com', sharedExternally: 5 }),
          sharer({ userPrincipalName: 'grace@contoso.com', sharedExternally: 9 }),
        ],
        oneDriveActivity: [sharer({ userPrincipalName: 'ada@contoso.com', sharedExternally: 7 })],
      }),
      NOW,
    )
    expect(overview.external.facets.sharer).toEqual([
      { id: 'ada@contoso.com', name: 'ada@contoso.com', count: 12 },
      { id: 'grace@contoso.com', name: 'grace@contoso.com', count: 9 },
    ])
  })
})
