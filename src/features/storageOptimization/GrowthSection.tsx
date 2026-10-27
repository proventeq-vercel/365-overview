import { HelpButton } from '@/app/help/HelpButton'
import { formatBytes, formatNumber, formatShortMonthYear, formatSignedBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import { CleanUpForecast } from './CleanUpForecast'
import { buildCallout } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { MonoLineChart, type LineSeries } from '@/design/charts'
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

interface Props {
  overview: StorageOverview
  delay?: number
}

export function GrowthSection({ overview, delay }: Props) {
  const t = useTranslation()
  const { growth, sharePoint, oneDrive, cost } = overview
  const callout = buildCallout(overview, t)
  const forecasting = growth.rateSource !== 'none'
  const series: LineSeries[] = [
    { key: 'actualUsedBytes', name: t('storageOptimisation.growth.actual') },
    ...(forecasting
      ? [
          { key: 'projectedUsedBytes', name: t('storageOptimisation.growth.forecast'), dashed: true },
          ...(growth.afterCleanUp.applies
            ? [{ key: 'afterCleanUpBytes', name: t('storageOptimisation.growth.afterCleanUp'), dotted: true }]
            : []),
        ]
      : []),
  ]

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.growth.sectionTitle')}
      subtitle={t('storageOptimisation.growth.sectionSubtitle')}
      help={<HelpButton topic="growthForecast" />}
    >
      <SplitGrid className="lg:grid-cols-[7fr_5fr]">
        <Panel>
          <PanelLabel>{t('storageOptimisation.growth.trendTitle')}</PanelLabel>
          <MonoLineChart
            data={growth.points.map((point) => ({ ...point }))}
            xKey="month"
            series={series}
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
            {forecasting && (
              <MiniStat
                label={t('storageOptimisation.growth.avgMonthlyGrowth')}
                value={formatSignedBytes(growth.avgMonthlyGrowthBytes)}
              />
            )}
            {forecasting && (
              <MiniStat
                label={
                  growth.rateSource === 'monthly'
                    ? t('storageOptimisation.growth.addedInWindow', { months: growth.windowMonths })
                    : t('storageOptimisation.growth.addedInWindowDays', { days: growth.windowDays })
                }
                value={formatSignedBytes(growth.addedInWindowBytes)}
              />
            )}
            {sharePoint.siteReportRead && (
              <MiniStat
                label={t('storageOptimisation.growth.sites')}
                value={formatNumber(sharePoint.siteCount)}
              />
            )}
            {oneDrive.accountReportRead && (
              <MiniStat
                label={t('storageOptimisation.growth.drivesNearCap')}
                value={formatNumber(oneDrive.drivesNearCap)}
              />
            )}
            {oneDrive.overEntitlement !== null && oneDrive.overEntitlement.limit.basis !== 'driveLimit' && (
              <MiniStat
                label={t('storageOptimisation.growth.drivesOverLicence')}
                value={formatNumber(oneDrive.overEntitlement.count)}
              />
            )}
          </MiniStatRow>
        </Panel>

        <Panel>
          <PanelLabel>{t('storageOptimisation.growth.impactTitle')}</PanelLabel>
          <SoftCallout
            tone={callout.tone}
            pill={callout.pill}
            pillLabel={callout.pillLabel}
            headline={callout.headline}
            note={callout.note}
          />
          <MiniStatRow>
            <MiniStat
              label={t('storageOptimisation.growth.usedToday')}
              value={formatBytes(sharePoint.usedBytes)}
            />
            {forecasting && (
              <MiniStat
                label={t('storageOptimisation.growth.forecastEnd', { months: FORECAST_CHART_MONTHS })}
                value={formatBytes(growth.forecastEndBytes)}
              />
            )}
            {sharePoint.overageBytes !== null && (
              <MiniStat
                label={t('storageOptimisation.growth.overEntitlement')}
                value={formatBytes(sharePoint.overageBytes)}
              />
            )}
          </MiniStatRow>
          {growth.afterCleanUp.applies && <CleanUpForecast overview={overview} />}
          {cost.applies && (
          <div className="mt-3 flex flex-col gap-1">
            <PanelLabel>{t('storageOptimisation.growth.costTitle')}</PanelLabel>
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
            <PanelDescription>{t('storageOptimisation.growth.costSubtitle')}</PanelDescription>
          </div>
          )}
        </Panel>
      </SplitGrid>
    </Section>
  )
}
