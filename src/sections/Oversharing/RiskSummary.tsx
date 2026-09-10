import { StatCard } from '@/components/StatCard'
import { SectionUnavailable } from './unavailableFor'
import { formatNumber } from '@/lib/format'
import type { OversharingOverview } from '@/types/oversharing'

interface RiskSummaryProps {
  overview: OversharingOverview
  adminConsentUrl: string | null
}

export function RiskSummary({ overview, adminConsentUrl }: RiskSummaryProps) {
  if (overview.risk === null || overview.scope === null) {
    return (
      <SectionUnavailable entries={overview.unavailable} section="links" adminConsentUrl={adminConsentUrl} />
    )
  }

  const guests = overview.external.guests
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="High risk"
        value={formatNumber(overview.risk.high)}
        sub="Anyone links — open without signing in"
        status="attention"
      />
      <StatCard
        label="Medium risk"
        value={formatNumber(overview.risk.medium)}
        sub="Organisation-wide links"
        status="watch"
      />
      <StatCard
        label="Lower risk"
        value={formatNumber(overview.risk.lower)}
        sub={
          guests === null
            ? 'Guest links — guest account count unavailable'
            : `Guest links, across ${formatNumber(guests.total)} guest accounts`
        }
        status="healthy"
      />
    </div>
  )
}
