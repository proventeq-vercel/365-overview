import { formatBytes, formatPercent } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import { forecastHeadline, forecastHint } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { P365, RISK_COLOR } from '@/design/theme'

interface Props {
  overview: StorageOverview
}

export function KpiCards({ overview }: Props) {
  const t = useTranslation()
  const { sharePoint, growth, cost } = overview
  const quotaKnown = sharePoint.entitledBytes !== null
  const rate = formatMoney(cost.ratePerGb, cost.currency)

  return (
    <div className="enter-rise flex flex-col gap-2" style={{ animationDelay: '40ms' }}>
      <div>
        <p className="text-sm font-semibold text-p365-navy">{t('storageOptimisation.capacity.title')}</p>
        <p className="text-sm text-p365-grey-500">{t('storageOptimisation.capacity.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('storageOptimisation.kpi.used')}
          value={formatBytes(sharePoint.usedBytes)}
          color={P365.navy}
          information={
            <>
              {sharePoint.entitledBytes === null
                ? t('storageOptimisation.kpi.usedEntitlementUnknown')
                : t('storageOptimisation.kpi.usedOfEntitled', {
                    used: formatBytes(sharePoint.usedBytes),
                    entitled: formatBytes(sharePoint.entitledBytes),
                  })}
              <br />
              {t('storageOptimisation.kpi.usedTenantWide')}
            </>
          }
        />
        <StatCard
          label={t('storageOptimisation.kpi.remaining')}
          value={
            sharePoint.remainingBytes === null
              ? t('storageOptimisation.kpi.unknown')
              : formatBytes(sharePoint.remainingBytes)
          }
          color={quotaKnown ? P365.green : P365.grey400}
          information={
            sharePoint.headroomRatio === null
              ? t('storageOptimisation.kpi.remainingUnknownHint')
              : t('storageOptimisation.kpi.remainingHint', {
                  percent: formatPercent(sharePoint.headroomRatio, 1),
                })
          }
        />
        <StatCard
          label={t('storageOptimisation.kpi.costOfNothing')}
          value={formatMoney(cost.growthAnnual, cost.currency)}
          color={P365.yellow}
          information={t('storageOptimisation.kpi.costOfNothingHint', { rate })}
        />
        <StatCard
          label={t('storageOptimisation.kpi.forecast')}
          value={forecastHeadline(overview, t)}
          color={quotaKnown ? RISK_COLOR[growth.forecastStatus] : P365.grey400}
          information={forecastHint(overview, t)}
        />
      </div>
    </div>
  )
}
