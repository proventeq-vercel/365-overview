import { guestDomain, isExternalDomain } from '../lib/domains'
import type { Severity } from '../lib/severity'
import { coverageOf, severityFor } from '../lib/severity'
import { SITE_TYPE_LABELS, siteTypeOf } from '../lib/siteType'
import type {
  CardKey,
  CardStat,
  DailySharingCounts,
  DomainCount,
  ExternalFacets,
  FacetItem,
  GroupTotals,
  GuestAccount,
  GuestTotals,
  LinkTotals,
  LinkAudience,
  OversharingInputs,
  OversharingOverview,
  ReportScope,
  RiskTotals,
  SharerRow,
  SiteEvidenceRow,
  SiteFacets,
  SiteRow,
  SiteType,
  TrendPoint,
  UnifiedGroup,
  UserSharingActivity,
} from '../types/oversharing'

export const TOP_DOMAINS = 8
export const TOP_SHARERS = 10
export const HIGHLY_SHARED_LINKS_PER_FILE = 0.25
export const FULL_TREND_DAYS = 180
export const FACET_LIMIT = 50

const MS_PER_DAY = 86400000

const NO_CARDS: Record<CardKey, CardStat | null> = {
  anyoneLinks: null,
  organizationLinks: null,
  externalUserAccess: null,
  forwardableLinks: null,
  mostSharedSites: null,
  publicGroups: null,
}

function card(count: number, affectedItems: number, totalItems: number): CardStat {
  const coverage = coverageOf(affectedItems, totalItems)
  return { count, affectedItems, totalItems, coverage, severity: severityFor(count, coverage) }
}

function sum(sites: SiteRow[], pick: (site: SiteRow) => number): number {
  return sites.reduce((total, site) => total + pick(site), 0)
}

function countWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0)
}

function scopeOf(sites: SiteRow[]): ReportScope {
  return {
    sites: sites.length,
    files: sum(sites, (site) => site.fileCount),
    groupConnectedSites: countWhere(sites, (site) => site.isGroupConnected),
  }
}

function linkTotalsOf(sites: SiteRow[]): LinkTotals {
  return {
    anonymous: sum(sites, (site) => site.anonymousLinks),
    organization: sum(sites, (site) => site.organizationLinks),
    guest: sum(sites, (site) => site.guestLinks),
    member: sum(sites, (site) => site.memberLinks),
  }
}

const AUDIENCE_ORDER: LinkAudience[] = ['anyone', 'organization', 'guest', 'member']

const AUDIENCE_LABELS: Record<LinkAudience, string> = {
  anyone: 'Anyone with the link',
  organization: 'Organisation-wide',
  guest: 'Guest',
  member: 'Members only',
}

const AUDIENCE_LINKS: Record<LinkAudience, (site: SiteRow) => number> = {
  anyone: (site) => site.anonymousLinks,
  organization: (site) => site.organizationLinks,
  guest: (site) => site.guestLinks,
  member: (site) => site.memberLinks,
}

function broadLinksOf(site: SiteRow): number {
  return site.anonymousLinks + site.organizationLinks + site.guestLinks
}

function broadLinksPerFile(site: SiteRow): number | null {
  if (site.fileCount <= 0) return null
  return broadLinksOf(site) / site.fileCount
}

function audiencesOf(site: SiteRow): LinkAudience[] {
  return AUDIENCE_ORDER.filter((audience) => AUDIENCE_LINKS[audience](site) > 0)
}

function siteSeverityOf(site: SiteRow): Severity | null {
  const broadLinks = broadLinksOf(site)
  if (broadLinks <= 0) return 'none'
  const perFile = broadLinksPerFile(site)
  if (perFile === null) return null
  return severityFor(broadLinks, Math.min(perFile, 1))
}

function siteEvidenceOf(sites: SiteRow[]): SiteEvidenceRow[] {
  return sites.map((site) => ({
    ...site,
    siteType: siteTypeOf(site.template, site.isGroupConnected),
    broadLinks: broadLinksOf(site),
    broadLinksPerFile: broadLinksPerFile(site),
    audiences: audiencesOf(site),
    severity: siteSeverityOf(site),
  }))
}

function riskOf(links: LinkTotals): RiskTotals {
  return { high: links.anonymous, medium: links.organization, lower: links.guest }
}

function externalDomainOf(guest: GuestAccount, verifiedDomains: string[]): string | null {
  const domain = guestDomain(guest)
  if (domain === null) return null
  return isExternalDomain(domain, verifiedDomains) ? domain : null
}

function guestTotalsOf(guests: GuestAccount[]): GuestTotals {
  return {
    total: guests.length,
    pending: guests.filter((guest) => guest.externalUserState === 'PendingAcceptance').length,
    disabled: guests.filter((guest) => !guest.accountEnabled).length,
    unattributed: guests.filter((entry) => guestDomain(entry) === null).length,
  }
}

function domainCountsOf(guests: GuestAccount[], verifiedDomains: string[]): DomainCount[] {
  const counts = new Map<string, number>()
  for (const guest of guests) {
    const domain = externalDomainOf(guest, verifiedDomains)
    if (domain === null) continue
    counts.set(domain, (counts.get(domain) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([domain, guestCount]) => ({ domain, guests: guestCount }))
    .sort((a, b) => b.guests - a.guests || a.domain.localeCompare(b.domain))
}

function topDomainsOf(domainCounts: DomainCount[]): DomainCount[] {
  return domainCounts.slice(0, TOP_DOMAINS)
}

function topSharersOf(
  sharePoint: UserSharingActivity[] | null,
  oneDrive: UserSharingActivity[] | null,
): SharerRow[] | null {
  if (sharePoint === null && oneDrive === null) return null
  const rows = new Map<string, SharerRow>()
  const add = (activity: UserSharingActivity[] | null, service: 'sharePoint' | 'oneDrive') => {
    for (const user of activity ?? []) {
      if (user.userPrincipalName === '' || user.sharedExternally <= 0) continue
      const row = rows.get(user.userPrincipalName) ?? {
        userPrincipalName: user.userPrincipalName,
        sharePoint: 0,
        oneDrive: 0,
        total: 0,
      }
      row[service] += user.sharedExternally
      row.total += user.sharedExternally
      rows.set(user.userPrincipalName, row)
    }
  }
  add(sharePoint, 'sharePoint')
  add(oneDrive, 'oneDrive')
  return [...rows.values()]
    .sort((a, b) => b.total - a.total || a.userPrincipalName.localeCompare(b.userPrincipalName))
    .slice(0, TOP_SHARERS)
}

function trendOf(
  sharePoint: DailySharingCounts[] | null,
  oneDrive: DailySharingCounts[] | null,
): TrendPoint[] | null {
  if (sharePoint === null && oneDrive === null) return null
  const points = new Map<string, TrendPoint>()
  const add = (series: DailySharingCounts[] | null, service: 'sharePoint' | 'oneDrive') => {
    for (const day of series ?? []) {
      const point = points.get(day.date) ?? { date: day.date, sharePoint: 0, oneDrive: 0 }
      point[service] += day.sharedExternally
      points.set(day.date, point)
    }
  }
  add(sharePoint, 'sharePoint')
  add(oneDrive, 'oneDrive')
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function reportLagDaysOf(reportRefreshDate: string | null, now: Date): number | null {
  if (reportRefreshDate === null) return null
  const refreshed = Date.parse(reportRefreshDate)
  if (Number.isNaN(refreshed)) return null
  const days = Math.floor((now.getTime() - refreshed) / MS_PER_DAY)
  return days < 0 ? null : days
}

function groupTotalsOf(groups: UnifiedGroup[] | null): GroupTotals | null {
  if (groups === null) return null
  const publicGroups = groups.filter((group) => group.isPublic).length
  return { publicGroups, privateGroups: groups.length - publicGroups, totalGroups: groups.length }
}

function byCountThenName(a: FacetItem, b: FacetItem): number {
  return b.count - a.count || a.name.localeCompare(b.name)
}

function audienceFacetOf(rows: SiteEvidenceRow[]): FacetItem[] {
  return AUDIENCE_ORDER.map((audience) => ({
    id: audience,
    name: AUDIENCE_LABELS[audience],
    count: countWhere(rows, (row) => row.audiences.includes(audience)),
  }))
}

function siteFacetOf(rows: SiteEvidenceRow[]): FacetItem[] {
  return rows
    .filter((row) => row.broadLinks > 0)
    .map((row) => ({ id: row.siteId, name: row.siteUrl, count: row.broadLinks }))
    .sort(byCountThenName)
    .slice(0, FACET_LIMIT)
}

function siteTypeFacetOf(rows: SiteEvidenceRow[]): FacetItem[] {
  const counts = new Map<SiteType, number>()
  for (const row of rows) {
    counts.set(row.siteType, (counts.get(row.siteType) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([siteType, count]) => ({ id: siteType, name: SITE_TYPE_LABELS[siteType], count }))
    .sort(byCountThenName)
}

function facetsOf(rows: SiteEvidenceRow[]): SiteFacets {
  return {
    audience: audienceFacetOf(rows),
    site: siteFacetOf(rows),
    siteType: siteTypeFacetOf(rows),
  }
}

function externalFacetsOf(
  domainCounts: DomainCount[] | null,
  sharers: SharerRow[] | null,
): ExternalFacets {
  return {
    domain: (domainCounts ?? [])
      .filter((entry) => entry.guests > 0)
      .map((entry) => ({ id: entry.domain, name: entry.domain, count: entry.guests }))
      .slice(0, FACET_LIMIT),
    sharer: (sharers ?? [])
      .filter((sharer) => sharer.total > 0)
      .map((sharer) => ({
        id: sharer.userPrincipalName,
        name: sharer.userPrincipalName,
        count: sharer.total,
      })),
  }
}

function cardsOf(
  sites: SiteRow[] | null,
  links: LinkTotals | null,
  audience: GroupTotals | null,
): Record<CardKey, CardStat | null> {
  const cards = { ...NO_CARDS }
  if (sites !== null && links !== null) {
    const total = sites.length
    cards.anyoneLinks = card(links.anonymous, countWhere(sites, (s) => s.anonymousLinks > 0), total)
    cards.organizationLinks = card(
      links.organization,
      countWhere(sites, (s) => s.organizationLinks > 0),
      total,
    )
    cards.externalUserAccess = card(links.guest, countWhere(sites, (s) => s.guestLinks > 0), total)
    cards.forwardableLinks = card(
      links.anonymous + links.organization,
      countWhere(sites, (s) => s.anonymousLinks > 0 || s.organizationLinks > 0),
      total,
    )
    const highlyShared = countWhere(
      sites,
      (s) => (broadLinksPerFile(s) ?? 0) >= HIGHLY_SHARED_LINKS_PER_FILE,
    )
    cards.mostSharedSites = card(highlyShared, highlyShared, total)
  }
  if (audience !== null) {
    cards.publicGroups = card(audience.publicGroups, audience.publicGroups, audience.totalGroups)
  }
  return cards
}

export function buildOversharingOverview(
  inputs: OversharingInputs,
  now: Date = new Date(),
): OversharingOverview {
  const live = inputs.siteUsage === null ? null : inputs.siteUsage.filter((site) => !site.isDeleted)
  const sites = live === null ? null : siteEvidenceOf(live)
  const links = sites === null ? null : linkTotalsOf(sites)
  const audience = groupTotalsOf(inputs.groups)
  const verifiedDomains = inputs.organization?.verifiedDomains ?? []
  const guests = inputs.guests
  const domainCounts = guests === null ? null : domainCountsOf(guests, verifiedDomains)
  const trend = trendOf(inputs.sharePointFileCounts, inputs.oneDriveFileCounts)
  const topSharers = topSharersOf(inputs.sharePointActivity, inputs.oneDriveActivity)

  return {
    reportRefreshDate: inputs.reportRefreshDate,
    tenant: inputs.organization,
    scope: sites === null ? null : scopeOf(sites),
    links,
    risk: links === null ? null : riskOf(links),
    cards: cardsOf(sites, links, audience),
    sites,
    facets: sites === null ? null : facetsOf(sites),
    external: {
      guests: guests === null ? null : guestTotalsOf(guests),
      topDomains: domainCounts === null ? null : topDomainsOf(domainCounts),
      externalDomainCount: domainCounts === null ? null : domainCounts.length,
      trend,
      trendDays: trend === null ? null : trend.length,
      topSharers,
      facets: externalFacetsOf(domainCounts, topSharers),
      sitesExternalWithoutLabel:
        sites === null
          ? null
          : countWhere(sites, (s) => s.externalSharingEnabled && s.sensitivityLabelId === null),
    },
    audience,
    posture: inputs.tenantSharing,
    guestPolicy: inputs.guestPolicy,
    globalAdmins: inputs.globalAdmins,
    caveats: {
      namesAreConcealed: inputs.reportSettings?.displayConcealedNames === true,
      countsAreLinksNotFiles: true,
      reportLagDays: reportLagDaysOf(inputs.reportRefreshDate, now),
    },
    unavailable: inputs.unavailable,
  }
}
