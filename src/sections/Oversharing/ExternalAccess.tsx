import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/StatCard'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DataTable } from '@/components/DataTable'
import { formatNumber } from '@/lib/format'
import { FULL_TREND_DAYS } from '@/model/oversharingOverview'
import type { OversharingOverview } from '@/types/oversharing'
import { SectionUnavailable } from './unavailableFor'

interface ExternalAccessProps {
  overview: OversharingOverview
  adminConsentUrl: string | null
}

export function ExternalAccess({ overview, adminConsentUrl }: ExternalAccessProps) {
  const { external, unavailable } = overview

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {external.guests === null ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <SectionUnavailable entries={unavailable} section="guests" adminConsentUrl={adminConsentUrl} />
          </div>
        ) : (
          <>
            <StatCard label="Guest accounts" value={formatNumber(external.guests.total)} sub="in your directory" />
            <StatCard
              label="Pending invitations"
              value={formatNumber(external.guests.pending)}
              sub="invited, never accepted"
            />
            <StatCard
              label="Disabled guests"
              value={formatNumber(external.guests.disabled)}
              sub="still present, cannot sign in"
            />
            <StatCard
              label="External domains"
              value={external.externalDomainCount === null ? '—' : formatNumber(external.externalDomainCount)}
              sub={
                external.guests.unattributed > 0
                  ? `${formatNumber(external.guests.unattributed)} guests have no readable address`
                  : 'every guest attributed to a domain'
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-hairline shadow-none">
          <CardContent className="flex flex-col gap-3 p-5">
            <span className="text-sm font-semibold text-ink">Top external domains</span>
            {external.topDomains === null ? (
              <SectionUnavailable entries={unavailable} section="guests" adminConsentUrl={adminConsentUrl} compact />
            ) : external.topDomains.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guest accounts from outside your verified domains.</p>
            ) : (
              <BarBreakdown
                data={external.topDomains.map((entry) => ({ domain: entry.domain, guests: entry.guests }))}
                categoryKey="domain"
                valueKeys={[{ key: 'guests', name: 'Guests' }]}
                ariaLabel="Guest accounts by external domain"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-hairline shadow-none">
          <CardContent className="flex flex-col gap-3 p-5">
            <span className="text-sm font-semibold text-ink">External sharing over time</span>
            {external.trend === null ? (
              <SectionUnavailable entries={unavailable} section="trend" adminConsentUrl={adminConsentUrl} compact />
            ) : (
              <>
                <AreaTrend
                  data={external.trend.map((point) => ({ ...point }))}
                  xKey="date"
                  series={[
                    { key: 'sharePoint', name: 'SharePoint' },
                    { key: 'oneDrive', name: 'OneDrive' },
                  ]}
                  ariaLabel="Files shared externally per day"
                />
                <p className="text-xs text-muted-foreground">
                  {external.trendDays !== null && external.trendDays < FULL_TREND_DAYS
                    ? `Measured over the ${formatNumber(external.trendDays)} days Microsoft 365 has data for — fewer than the ${FULL_TREND_DAYS} requested, so this is not yet a full six-month picture.`
                    : `Measured daily over ${FULL_TREND_DAYS} days. Nothing here is projected.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-hairline shadow-none">
        <CardContent className="flex flex-col gap-3 p-5">
          <span className="text-sm font-semibold text-ink">Heaviest external sharers</span>
          {external.topSharers === null ? (
            <SectionUnavailable entries={unavailable} section="sharers" adminConsentUrl={adminConsentUrl} compact />
          ) : external.topSharers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody shared a file externally in this period.</p>
          ) : (
            <DataTable
              columns={[
                { key: 'userPrincipalName', header: 'Person' },
                { key: 'sharePoint', header: 'SharePoint', render: (row) => formatNumber(row.sharePoint as number) },
                { key: 'oneDrive', header: 'OneDrive', render: (row) => formatNumber(row.oneDrive as number) },
                { key: 'total', header: 'Total', render: (row) => formatNumber(row.total as number) },
              ]}
              rows={external.topSharers.map((row) => ({ ...row }))}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Counted as sharing actions on files over the period, not as links that still exist today.
          </p>
        </CardContent>
      </Card>

      {external.sitesExternalWithoutLabel !== null && (
        <Card className="border-hairline shadow-none">
          <CardContent className="flex flex-col gap-1 p-5">
            <span className="text-sm font-semibold text-ink">Externally shareable sites with no sensitivity label</span>
            <span className="text-3xl font-bold tabular text-ink">
              {formatNumber(external.sitesExternalWithoutLabel)}
            </span>
            <span className="text-xs text-muted-foreground">
              External sharing is switched on for these sites and no sensitivity label governs what leaves them.
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
