import { Card, CardContent } from '@/components/ui/card'
import { ModuleCard } from '@/components/ModuleCard'
import { DonutShare } from '@/components/charts/DonutShare'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { formatNumber } from '@/lib/format'
import { topNWithOther } from '@/lib/topNWithOther'
import type { CardKey, OversharingOverview } from '@/types/oversharing'
import { CARD_COPY } from './copy'
import { SectionUnavailable } from './unavailableFor'

const SITE_CARDS: CardKey[] = [
  'anyoneLinks',
  'organizationLinks',
  'externalUserAccess',
  'forwardableLinks',
  'mostSharedSites',
]

function siteName(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() || url
}

interface BroadSharingProps {
  overview: OversharingOverview
  adminConsentUrl: string | null
}

export function BroadSharing({ overview, adminConsentUrl }: BroadSharingProps) {
  const { cards, links, sites } = overview

  const linkMix =
    links === null
      ? []
      : [
          { kind: 'Anyone', links: links.anonymous },
          { kind: 'Organisation-wide', links: links.organization },
          { kind: 'Guest', links: links.guest },
          { kind: 'Member', links: links.member },
        ].filter((slice) => slice.links > 0)

  const topAnyoneSites =
    sites === null
      ? []
      : topNWithOther(
          sites.filter((site) => site.anonymousLinks > 0),
          10,
          (site) => siteName(site.siteUrl),
          (site) => site.anonymousLinks,
        )
          .filter((slice) => slice.label !== 'Other')
          .map((slice) => ({ site: slice.label, links: slice.value }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_CARDS.map((key) => (
          <ModuleCard
            key={key}
            title={CARD_COPY[key].title}
            description={CARD_COPY[key].description}
            stat={cards[key]}
            countDescription={(stat) =>
              CARD_COPY[key].countDescription(
                formatNumber(stat.count),
                formatNumber(stat.affectedItems),
                formatNumber(stat.totalItems),
              )
            }
            coverageLabel="Share of sites affected"
            unavailable={
              <SectionUnavailable
                entries={overview.unavailable}
                section="links"
                adminConsentUrl={adminConsentUrl}
                compact
              />
            }
          />
        ))}
        <ModuleCard
          title={CARD_COPY.publicGroups.title}
          description={CARD_COPY.publicGroups.description}
          stat={cards.publicGroups}
          countDescription={(stat) =>
            CARD_COPY.publicGroups.countDescription(
              formatNumber(stat.count),
              formatNumber(stat.affectedItems),
              formatNumber(stat.totalItems),
            )
          }
          coverageLabel="Share of groups that are public"
          unavailable={
            <SectionUnavailable
              entries={overview.unavailable}
              section="groups"
              adminConsentUrl={adminConsentUrl}
              compact
            />
          }
        />
      </div>

      {links !== null && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-hairline shadow-none">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="text-sm font-semibold text-ink">Link mix</span>
              {linkMix.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sharing links of any kind were found in this tenant.
                </p>
              ) : (
                <DonutShare
                  data={linkMix}
                  nameKey="kind"
                  valueKey="links"
                  ariaLabel="Sharing links by audience"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-hairline shadow-none lg:col-span-2">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="text-sm font-semibold text-ink">Top sites by Anyone links</span>
              {topAnyoneSites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No site in this tenant has an Anyone link.
                </p>
              ) : (
                <BarBreakdown
                  data={topAnyoneSites}
                  categoryKey="site"
                  valueKeys={[{ key: 'links', name: 'Anyone links' }]}
                  ariaLabel="Sites with the most Anyone links"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
