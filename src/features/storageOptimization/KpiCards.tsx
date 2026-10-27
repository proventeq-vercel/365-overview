import { formatBytes, formatLongMonthYear, formatNumber, formatPercent } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import { costHint, forecastCard } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { KPI_GRID_COLUMNS } from '@/design/kpiGrid'
import { HEALTH_COLOR, P365, RISK_COLOR } from '@/design/theme'

interface Props {
  overview: StorageOverview
  delay?: number
}

export function KpiCards({ overview, delay = 0 }: Props) {
  const t = useTranslation()
  const { sharePoint, cost, archive } = overview
  const forecast = forecastCard(overview, t)
  const rate = formatMoney(cost.ratePerGb, cost.currency)
  const inactivity = {
    years: archive.inactiveYears,
    date: formatLongMonthYear(archive.inactiveSince),
  }

  const cards = [
    archive.applies && (
    <StatCard
      key="archivable"
      label={t('storageOptimisation.kpi.archivable')}
      value={formatBytes(archive.bytes)}
      color={HEALTH_COLOR[archive.status]}
      information={
        archive.siteCount === 0
          ? t('storageOptimisation.kpi.archivableNoneHint', inactivity)
          : t('storageOptimisation.kpi.archivableHint', {
              ...inactivity,
              percent: formatPercent(archive.shareOfSharePoint, 1),
              count: archive.siteCount,
              sites: formatNumber(archive.siteCount),
            })
      }
    />
    ),
    archive.savingApplies && (
      <StatCard
        key="saving"
        label={t('storageOptimisation.kpi.saving')}
        value={formatMoney(archive.annualSaving, cost.currency)}
        color={HEALTH_COLOR[archive.status]}
        information={
          archive.siteCount === 0
            ? t('storageOptimisation.kpi.savingNoneHint')
            : sharePoint.exhausted && sharePoint.overageBytes !== null
              ? t('storageOptimisation.kpi.savingOverHint', {
                  saved: formatBytes(archive.savingBytes),
                  overage: formatBytes(sharePoint.overageBytes),
                  rate,
                })
              : t('storageOptimisation.kpi.savingHint', { size: formatBytes(archive.bytes), rate })
        }
      />
    ),
    cost.applies && (
      <StatCard
        key="cost"
        label={t('storageOptimisation.kpi.costOfNothing')}
        value={formatMoney(cost.growthAnnual, cost.currency)}
        color={HEALTH_COLOR[cost.growthAnnualStatus]}
        information={costHint(overview, rate, t)}
      />
    ),
    !sharePoint.exhausted && (
      <StatCard
        key="forecast"
        label={forecast.label}
        value={forecast.value}
        color={forecast.status === null ? P365.navy : RISK_COLOR[forecast.status]}
        information={forecast.hint}
      />
    ),
  ].filter(Boolean)

  return (
    <section
      aria-label={t('storageOptimisation.capacity.title')}
      className={`enter-rise grid grid-cols-1 gap-4 sm:grid-cols-2 ${KPI_GRID_COLUMNS[cards.length]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {cards}
    </section>
  )
}
