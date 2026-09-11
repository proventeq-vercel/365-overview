import { AreaTrend } from '@/components/charts/AreaTrend'
import { formatBytes, formatNumber } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { buildCallout } from './forecastCopy'
import { GrowthImpactCallout } from './GrowthImpactCallout'
import { formatMoney } from './money'
import { MiniStat, MiniStatRow, Panel, SectionShell } from './SectionShell'

interface Props {
  overview: StorageOverview
}

export function GrowthSection({ overview }: Props) {
  const { growth, sharePoint, oneDrive, cost } = overview
  const callout = buildCallout(overview)

  const projected =
    cost.growthBillableAnnual !== null && cost.cumulativeBillableYear3 !== null
      ? {
          billable: true,
          annual: cost.growthBillableAnnual,
          cumulative: cost.cumulativeBillableYear3,
        }
      : {
          billable: false,
          annual: cost.growthNotionalAnnual,
          cumulative: cost.cumulativeNotionalYear3,
        }

  return (
    <SectionShell
      title="Future state & growth impact"
      subtitle="Where storage is heading at the current growth rate — and what it costs if nothing changes"
      className="delay-150"
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title={COPY.growth.trendTitle}>
            <AreaTrend
              data={growth.points.map((point) => ({ ...point }))}
              xKey="month"
              series={[
                { key: 'actualUsedBytes', name: COPY.growth.actual },
                { key: 'projectedUsedBytes', name: COPY.growth.forecast },
              ]}
              valueFormatter={formatBytes}
              ariaLabel={COPY.growth.trendTitle}
              height={300}
            />
            <MiniStatRow>
              <MiniStat
                label={COPY.growth.avgMonthlyGrowth}
                value={`+${formatBytes(growth.avgMonthlyGrowthBytes)}`}
              />
              <MiniStat
                label={COPY.growth.addedInWindow(growth.windowMonths)}
                value={formatBytes(growth.addedInWindowBytes)}
              />
              <MiniStat label={COPY.growth.sites} value={formatNumber(sharePoint.sites.length)} />
              <MiniStat
                label={COPY.growth.drivesNearCap}
                value={formatNumber(oneDrive.drivesNearCap)}
              />
            </MiniStatRow>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title={COPY.growth.impactTitle}>
            <GrowthImpactCallout callout={callout} />
            <MiniStatRow>
              <MiniStat label={COPY.growth.usedToday} value={formatBytes(sharePoint.usedBytes)} />
              <MiniStat
                label={COPY.growth.forecastEnd(FORECAST_CHART_MONTHS)}
                value={formatBytes(growth.forecastEndBytes)}
              />
              <MiniStat
                label={COPY.growth.overEntitlement}
                value={
                  sharePoint.overageBytes === null
                    ? COPY.kpi.unknown
                    : formatBytes(sharePoint.overageBytes)
                }
              />
            </MiniStatRow>

            <h4 className="text-sm font-semibold text-ink-soft">
              {projected.billable ? COPY.growth.costTitle : COPY.growth.costTitleNotional}
            </h4>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{COPY.growth.nextTwelveMonths}</dt>
                <dd className="text-xl font-bold tabular text-ink">
                  {formatMoney(projected.annual, cost.currency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{COPY.growth.cumulativeThreeYears}</dt>
                <dd className="text-lg font-semibold tabular text-ink">
                  {formatMoney(projected.cumulative, cost.currency)}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {projected.billable ? COPY.growth.costSubtitle : COPY.growth.costSubtitleNotional}
            </p>
          </Panel>
        </div>
      </div>
    </SectionShell>
  )
}
