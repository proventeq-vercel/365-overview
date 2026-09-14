import { formatBytes, formatNumber, formatShortMonthYear, formatSignedBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import { COPY } from './copy'
import { buildCallout } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { MonoLineChart } from '@/design/charts'
import {
  KvRow,
  MiniStat,
  MiniStatRow,
  PanelDescription,
  PanelLabel,
  Panel,
  Section,
  SoftCallout,
  SplitGrid,
} from '@/design/primitives'
import { RISK_LABEL } from '@/design/theme'

interface Props {
  overview: StorageOverview
  delay?: number
}

export function GrowthSection({ overview, delay }: Props) {
  const { growth, sharePoint, oneDrive, cost } = overview
  const callout = buildCallout(overview)
  const quotaKnown = sharePoint.entitledBytes !== null

  const projected =
    cost.growthBillableAnnual !== null && cost.cumulativeBillableYear3 !== null
      ? { billable: true, annual: cost.growthBillableAnnual, cumulative: cost.cumulativeBillableYear3 }
      : { billable: false, annual: cost.growthNotionalAnnual, cumulative: cost.cumulativeNotionalYear3 }

  return (
    <Section
      delay={delay}
      title="Future state & growth impact"
      subtitle="Where storage is heading at the current growth rate — and what it costs if nothing changes"
    >
      <SplitGrid className="lg:grid-cols-[7fr_5fr]">
        <Panel>
          <PanelLabel>{COPY.growth.trendTitle}</PanelLabel>
          <MonoLineChart
            data={growth.points.map((point) => ({ ...point }))}
            xKey="month"
            series={[
              { key: 'actualUsedBytes', name: COPY.growth.actual },
              { key: 'projectedUsedBytes', name: COPY.growth.forecast, dashed: true },
            ]}
            formatValue={formatBytes}
            formatX={formatShortMonthYear}
            ariaLabel={COPY.growth.trendTitle}
            referenceLine={
              sharePoint.entitledBytes === null
                ? undefined
                : { value: sharePoint.entitledBytes, label: COPY.growth.entitlement }
            }
          />
          <MiniStatRow>
            <MiniStat
              label={COPY.growth.avgMonthlyGrowth}
              value={formatSignedBytes(growth.avgMonthlyGrowthBytes)}
            />
            <MiniStat
              label={COPY.growth.addedInWindow(growth.windowMonths)}
              value={formatSignedBytes(growth.addedInWindowBytes)}
            />
            <MiniStat label={COPY.growth.sites} value={formatNumber(sharePoint.sites.length)} />
            <MiniStat label={COPY.growth.drivesNearCap} value={formatNumber(oneDrive.drivesNearCap)} />
          </MiniStatRow>
        </Panel>

        <Panel>
          <PanelLabel>{COPY.growth.impactTitle}</PanelLabel>
          <SoftCallout
            tone={callout.tone}
            pill={quotaKnown ? RISK_LABEL[growth.forecastStatus] : RISK_LABEL.Unknown}
            pillLabel={callout.pillLabel}
            headline={callout.headline}
            note={callout.note}
          />
          <MiniStatRow>
            <MiniStat label={COPY.growth.usedToday} value={formatBytes(sharePoint.usedBytes)} />
            <MiniStat
              label={COPY.growth.forecastEnd(FORECAST_CHART_MONTHS)}
              value={formatBytes(growth.forecastEndBytes)}
            />
            <MiniStat
              label={COPY.growth.overEntitlement}
              value={
                sharePoint.overageBytes === null ? COPY.kpi.unknown : formatBytes(sharePoint.overageBytes)
              }
            />
          </MiniStatRow>
          <div className="mt-3 flex flex-col gap-1">
            <PanelLabel>
              {projected.billable ? COPY.growth.costTitle : COPY.growth.costTitleNotional}
            </PanelLabel>
            <dl className="divide-y divide-p365-grey-100">
              <KvRow
                label={COPY.growth.nextTwelveMonths}
                value={formatMoney(projected.annual, cost.currency)}
              />
              <KvRow
                label={COPY.growth.cumulativeThreeYears}
                value={formatMoney(projected.cumulative, cost.currency)}
              />
            </dl>
            <PanelDescription>
              {projected.billable ? COPY.growth.costSubtitle : COPY.growth.costSubtitleNotional}
            </PanelDescription>
          </div>
        </Panel>
      </SplitGrid>
    </Section>
  )
}
