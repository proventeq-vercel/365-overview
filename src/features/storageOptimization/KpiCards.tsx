import { HelpButton } from '@/app/help/HelpButton'
import { formatBytes, formatLongMonthYear, formatNumber, formatPercent } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import { forecastHeadline, forecastHint } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { Section } from '@/design/primitives'
import { HEALTH_COLOR, P365, RISK_COLOR } from '@/design/theme'

interface Props {
  overview: StorageOverview
  delay?: number
}

export function KpiCards({ overview, delay }: Props) {
  const t = useTranslation()
  const { sharePoint, growth, cost, archive } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const rate = formatMoney(cost.ratePerGb, cost.currency)
  const inactivity = {
    years: archive.inactiveYears,
    date: formatLongMonthYear(archive.inactiveSince),
  }

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.capacity.title')}
      subtitle={t('storageOptimisation.capacity.subtitle')}
      help={<HelpButton topic="tenantCapacity" />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
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
        <StatCard
          label={t('storageOptimisation.kpi.saving')}
          value={formatMoney(archive.annualSaving, cost.currency)}
          color={HEALTH_COLOR[archive.status]}
          information={
            archive.siteCount === 0
              ? t('storageOptimisation.kpi.savingNoneHint')
              : t('storageOptimisation.kpi.savingHint', { size: formatBytes(archive.bytes), rate })
          }
        />
        <StatCard
          label={t('storageOptimisation.kpi.costOfNothing')}
          value={formatMoney(cost.growthAnnual, cost.currency)}
          color={HEALTH_COLOR[cost.growthAnnualStatus]}
          information={t('storageOptimisation.kpi.costOfNothingHint', { rate })}
        />
        <StatCard
          label={t('storageOptimisation.kpi.forecast')}
          value={forecastHeadline(overview, t)}
          color={quotaKnown ? RISK_COLOR[growth.forecastStatus] : P365.grey400}
          information={forecastHint(overview, t)}
        />
      </div>
    </Section>
  )
}
