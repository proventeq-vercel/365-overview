import { describe, expect, it } from 'vitest'
import { buildOversharingOverview } from './oversharingOverview'
import { noInputs, siteRow } from './fixtureBuilders'
import type { SiteEvidenceRow } from '../types/oversharing'

const NOW = new Date('2026-09-10T09:00:00Z')

function rowsFor(siteUsage: ReturnType<typeof siteRow>[]): SiteEvidenceRow[] {
  const overview = buildOversharingOverview(noInputs({ siteUsage }), NOW)
  if (overview.sites === null) throw new Error('expected evidence rows')
  return overview.sites
}

describe('site evidence rows — severity', () => {
  it('grades a site with no broad links as no exposure, whatever its member links', () => {
    const [row] = rowsFor([siteRow({ memberLinks: 5000, fileCount: 10 })])
    expect(row.severity).toBe('none')
    expect(row.broadLinks).toBe(0)
  })

  it('leaves severity unavailable when links exist but no file count does', () => {
    const [row] = rowsFor([siteRow({ anonymousLinks: 40, fileCount: 0 })])
    expect(row.severity).toBeNull()
    expect(row.broadLinksPerFile).toBeNull()
  })

  it('grades by the share of files carrying a broad link', () => {
    const [review, action, immediate] = rowsFor([
      siteRow({ siteId: 'a', anonymousLinks: 10, fileCount: 100 }),
      siteRow({ siteId: 'b', anonymousLinks: 45, fileCount: 100 }),
      siteRow({ siteId: 'c', anonymousLinks: 80, fileCount: 100 }),
    ])
    expect(review.severity).toBe('review')
    expect(action.severity).toBe('action')
    expect(immediate.severity).toBe('immediate')
  })

  it('caps coverage at one so a site with more links than files is not off the scale', () => {
    const [row] = rowsFor([siteRow({ anonymousLinks: 900, fileCount: 3 })])
    expect(row.severity).toBe('immediate')
    expect(row.broadLinksPerFile).toBe(300)
  })

  it('counts only broad links, never member links, towards exposure', () => {
    const [row] = rowsFor([
      siteRow({ anonymousLinks: 1, organizationLinks: 2, guestLinks: 3, memberLinks: 900 }),
    ])
    expect(row.broadLinks).toBe(6)
  })
})

describe('site evidence rows — audience and type', () => {
  it('lists only the audiences a site actually has, in a fixed order', () => {
    const [row] = rowsFor([siteRow({ memberLinks: 4, anonymousLinks: 2, guestLinks: 1 })])
    expect(row.audiences).toEqual(['anyone', 'guest', 'member'])
  })

  it('classifies the site by its template', () => {
    const [group, communication, team] = rowsFor([
      siteRow({ siteId: 'a', template: 'Group', isGroupConnected: true }),
      siteRow({ siteId: 'b', template: 'Communication Site' }),
      siteRow({ siteId: 'c', template: 'Team Site' }),
    ])
    expect(group.siteType).toBe('groupConnected')
    expect(communication.siteType).toBe('communication')
    expect(team.siteType).toBe('teamSite')
  })
})
