import { useMemo, useState } from 'react'
import { HelpButton } from '@/app/help/HelpButton'
import { formatBytes, formatNumber, formatShortMonthYear, formatSignedBytes } from '@/lib/format'
import { archivableSites } from '@/lib/archive'
import { costOverTime } from '@/lib/cost'
import { FORECAST_CHART_MONTHS, growthRows } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import { ArchiveSitePicker } from './ArchiveSitePicker'
import { CleanUpForecast } from './CleanUpForecast'
import { buildCallout } from './forecastCopy'
import { formatMoney } from './money'
import { useArchivePicks } from './useArchivePicks'
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

const TREND_MIN_HEIGHT = 256
const COST_HEIGHT = 168

interface Props {
  overview: StorageOverview
  delay?: number
}

export function GrowthSection({ overview, delay }: Props) {
  const t = useTranslation()
  const { growth, sharePoint, oneDrive, cost, archive } = overview
  const callout = buildCallout(overview, t)
  const forecasting = growth.rateSource !== 'none'
  const { picked, archivedBytes, setPicked } = useArchivePicks(overview)
  const [pickerOpen, setPickerOpen] = useState(false)
  const candidates = useMemo(
    () => archivableSites(sharePoint.sites, archive.inactiveSince),
    [sharePoint.sites, archive.inactiveSince],
  )
  const rows = useMemo(() => growthRows(growth.points, archivedBytes), [growth.points, archivedBytes])
  const costs = useMemo(
    () => costOverTime(growth.points, sharePoint.entitledBytes, cost.ratePerGb, archivedBytes),
    [growth.points, sharePoint.entitledBytes, cost.ratePerGb, archivedBytes],
  )
  const cleansUp = growth.afterCleanUp.applies && growth.afterCleanUp.removableBytes > 0

  const series: LineSeries[] = [
    { key: 'actualUsedBytes', name: t('storageOptimisation.growth.actual') },
    ...(forecasting
      ? [
          { key: 'projectedUsedBytes', name: t('storageOptimisation.growth.forecast'), dashed: true },
          ...(cleansUp
            ? [{ key: 'afterCleanUpBytes', name: t('storageOptimisation.growth.afterCleanUp'), dotted: true }]
            : []),
          ...(archivedBytes > 0
            ? [{ key: 'afterArchiveBytes', name: t('storageOptimisation.growth.afterArchive'), dashDot: true }]
            : []),
        ]
      : []),
  ]
  const billable = costs.basis === 'billable'
  const costSeries: LineSeries[] = [
    {
      key: 'forecastCost',
      name: billable ? t('storageOptimisation.growth.costSeries') : t('storageOptimisation.growth.costSeriesValue'),
    },
    ...(billable && cleansUp
      ? [{ key: 'afterCleanUpCost', name: t('storageOptimisation.growth.afterCleanUp'), dotted: true }]
      : []),
    ...(billable && archivedBytes > 0
      ? [{ key: 'afterArchiveCost', name: t('storageOptimisation.growth.afterArchive'), dashDot: true }]
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
            data={rows}
            xKey="month"
            series={series}
            formatValue={formatBytes}
            formatX={formatShortMonthYear}
            ariaLabel={t('storageOptimisation.growth.trendTitle')}
            height={TREND_MIN_HEIGHT}
            fill
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
          {cost.applies && (
            <div className="mt-3 flex flex-col gap-1">
              <PanelLabel>
                {billable ? t('storageOptimisation.growth.costTitle') : t('storageOptimisation.growth.costValueTitle')}
              </PanelLabel>
              {costs.rows.length > 0 && (
                <MonoLineChart
                  data={costs.rows.map((row) => ({ ...row }))}
                  xKey="month"
                  series={costSeries}
                  formatValue={(value) => formatMoney(value, cost.currency)}
                  formatX={formatShortMonthYear}
                  ariaLabel={t('storageOptimisation.growth.costTitle')}
                  height={COST_HEIGHT}
                />
              )}
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
                {billable
                  ? t('storageOptimisation.growth.costSubtitle')
                  : costs.basis === 'withinEntitlement'
                    ? t('storageOptimisation.growth.costWithinEntitlement')
                    : t('storageOptimisation.growth.costNotional')}
              </PanelDescription>
            </div>
          )}
          {growth.afterCleanUp.applies && (
            <CleanUpForecast
              overview={overview}
              pickedCount={picked.length}
              archivedBytes={archivedBytes}
              onChooseSites={() => setPickerOpen(true)}
            />
          )}
        </Panel>
      </SplitGrid>
      <ArchiveSitePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        sites={candidates}
        picked={picked}
        inactiveSince={archive.inactiveSince}
        inactiveYears={archive.inactiveYears}
        nameMask={overview.caveats.nameMask}
        onApply={setPicked}
      />
    </Section>
  )
}
