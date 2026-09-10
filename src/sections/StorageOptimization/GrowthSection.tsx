import { AreaTrend } from '@/components/charts/AreaTrend'
import { InsightCallout } from '@/components/InsightCallout'
import { formatBytes, formatNumber } from '@/lib/format'
import { HORIZON_MONTHS } from '@/lib/forecast'
import type { HealthStatus } from '@/lib/thresholds'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { formatMoney } from './money'
import { Panel, SectionShell } from './SectionShell'

const STATUS_TONE: Record<StorageOverview['growth']['forecastStatus'], HealthStatus> = {
  Healthy: 'healthy',
  Warning: 'watch',
  Critical: 'attention',
  Unknown: 'watch',
}

function impactMessage(overview: StorageOverview): string {
  const { growth, sharePoint, caveats } = overview
  if (caveats.historyTooShort) return COPY.forecastIndeterminateNote
  if (growth.forecastMonthsToExhaustion === 0) return COPY.alreadyExhaustedNote
  if (sharePoint.entitledBytes === null) return COPY.forecastUnavailableNote
  if (growth.forecastExhaustionDate === null) {
    return COPY.noExhaustionNote(HORIZON_MONTHS / 12)
  }
  return COPY.impactNote(growth.forecastExhaustionDate)
}

interface Props {
  overview: StorageOverview
}

export function GrowthSection({ overview }: Props) {
  const { growth, sharePoint, oneDrive, cost, caveats } = overview

  const qualifiers: string[] = [
    caveats.entitlementIsEstimated ? COPY.estimatedQuotaNote : '',
    growth.seriesIsVolatile ? COPY.volatileNote : '',
  ].filter((note) => note !== '')

  const billable = cost.growthBillableAnnual !== null
  const annual = billable
    ? formatMoney(cost.growthBillableAnnual!, cost.currency)
    : formatMoney(cost.growthNotionalAnnual, cost.currency)
  const cumulative = billable
    ? formatMoney(cost.cumulativeBillableYear3!, cost.currency)
    : formatMoney(cost.cumulativeNotionalYear3, cost.currency)

  return (
    <SectionShell
      title="Future state & growth impact"
      subtitle="Where storage is heading at the current growth rate — and what it costs if nothing changes"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel title="Storage trend and forecast">
            <AreaTrend
              data={growth.points.map((point) => ({ ...point }))}
              xKey="month"
              series={[
                { key: 'actualUsedBytes', name: 'Measured' },
                { key: 'projectedUsedBytes', name: 'Linear forecast' },
              ]}
              valueFormatter={formatBytes}
              ariaLabel="Storage trend and forecast"
            />
          </Panel>

          <InsightCallout
            status={STATUS_TONE[growth.forecastStatus]}
            message={impactMessage(overview)}
          />
          {qualifiers.map((note) => (
            <p key={note} className="text-sm text-muted-foreground">
              {note}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Panel title={billable ? 'Projected cost if nothing changes' : 'Projected value of growth'}>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Next 12 months</dt>
                <dd className="text-xl font-bold tabular text-ink">{annual}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Cumulative, 3 years</dt>
                <dd className="text-lg font-semibold tabular text-ink">{cumulative}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {billable
                ? COPY.costOfNothingHint(formatMoney(cost.ratePerGb, cost.currency))
                : `Notional — the value of the growth itself at ${formatMoney(cost.ratePerGb, cost.currency)}/GB per month. ${COPY.forecastUnavailableNote}`}
            </p>
          </Panel>

          <Panel title="Measured">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Average growth per month</dt>
                <dd className="tabular text-ink">
                  {formatBytes(growth.avgMonthlyGrowthBytes)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Months of history</dt>
                <dd className="tabular text-ink">{formatNumber(growth.windowMonths)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Sites</dt>
                <dd className="tabular text-ink">{formatNumber(sharePoint.sites.length)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Drives near their cap</dt>
                <dd className="tabular text-ink">{formatNumber(oneDrive.drivesNearCap)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </SectionShell>
  )
}
