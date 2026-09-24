import { formatBytes, formatMoney, formatNumber, formatShortMonthYear, formatSignedBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import { buildCallout } from './forecastCopy'
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
  const t = useTranslation()
  const { growth, sharePoint, oneDrive, cost } = overview
  const callout = buildCallout(overview, t)
  const quotaKnown = sharePoint.entitledBytes !== null

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.growth.sectionTitle')}
      subtitle={t('storageOptimisation.growth.sectionSubtitle')}
    >
      <SplitGrid className="lg:grid-cols-[7fr_5fr]">
        <Panel>
          <PanelLabel>{t('storageOptimisation.growth.trendTitle')}</PanelLabel>
          <MonoLineChart
            data={growth.points.map((point) => ({ ...point }))}
            xKey="month"
            series={[
              { key: 'actualUsedBytes', name: t('storageOptimisation.growth.actual') },
              { key: 'projectedUsedBytes', name: t('storageOptimisation.growth.forecast'), dashed: true },
            ]}
            formatValue={formatBytes}
            formatX={formatShortMonthYear}
            ariaLabel={t('storageOptimisation.growth.trendTitle')}
            referenceLine={
              sharePoint.entitledBytes === null
                ? undefined
                : {
                    value: sharePoint.entitledBytes,
                    label: t('storageOptimisation.growth.entitlement'),
                  }
            }
          />
          <MiniStatRow>
            <MiniStat
              label={t('storageOptimisation.growth.avgMonthlyGrowth')}
              value={formatSignedBytes(growth.avgMonthlyGrowthBytes)}
            />
            <MiniStat
              label={t('storageOptimisation.growth.addedInWindow', { months: growth.windowMonths })}
              value={formatSignedBytes(growth.addedInWindowBytes)}
            />
            <MiniStat
              label={t('storageOptimisation.growth.sites')}
              value={formatNumber(sharePoint.siteCount)}
            />
            <MiniStat
              label={t('storageOptimisation.growth.drivesNearCap')}
              value={formatNumber(oneDrive.drivesNearCap)}
            />
          </MiniStatRow>
        </Panel>

        <Panel>
          <PanelLabel>{t('storageOptimisation.growth.impactTitle')}</PanelLabel>
          <SoftCallout
            tone={callout.tone}
            pill={quotaKnown ? RISK_LABEL[growth.forecastStatus] : RISK_LABEL.Unknown}
            pillLabel={callout.pillLabel}
            headline={callout.headline}
            note={callout.note}
          />
          <MiniStatRow>
            <MiniStat
              label={t('storageOptimisation.growth.usedToday')}
              value={
                sharePoint.usedBytes === null
                  ? t('storageOptimisation.kpi.unknown')
                  : formatBytes(sharePoint.usedBytes)
              }
            />
            <MiniStat
              label={t('storageOptimisation.growth.forecastEnd', { months: FORECAST_CHART_MONTHS })}
              value={
                growth.forecastEndBytes === null
                  ? t('storageOptimisation.kpi.unknown')
                  : formatBytes(growth.forecastEndBytes)
              }
            />
            <MiniStat
              label={t('storageOptimisation.growth.overEntitlement')}
              value={
                sharePoint.overageBytes === null
                  ? t('storageOptimisation.kpi.unknown')
                  : formatBytes(sharePoint.overageBytes)
              }
            />
          </MiniStatRow>
          <div className="mt-3 flex flex-col gap-1">
            <PanelLabel>
              {cost.isBillable
                ? t('storageOptimisation.growth.costTitle')
                : t('storageOptimisation.growth.costTitleNotional')}
            </PanelLabel>
            <dl className="divide-y divide-p365-grey-100">
              <KvRow
                label={t('storageOptimisation.growth.nextTwelveMonths')}
                value={formatMoney(cost.growthAnnual, cost.currency)}
              />
              <KvRow
                label={t('storageOptimisation.growth.cumulativeThreeYears')}
                value={formatMoney(cost.cumulativeYear3, cost.currency)}
              />
            </dl>
            <PanelDescription>
              {cost.isBillable
                ? t('storageOptimisation.growth.costSubtitle')
                : t('storageOptimisation.growth.costSubtitleNotional')}
            </PanelDescription>
          </div>
        </Panel>
      </SplitGrid>
    </Section>
  )
}
