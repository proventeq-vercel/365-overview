import type { ReactNode } from 'react'
import { formatBytes, formatShare, formatShortDate } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import { costHint, forecastCard } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { KPI_GRID_COLUMNS } from '@/design/kpiGrid'
import { HEALTH_COLOR, P365, RISK_COLOR } from '@/design/theme'
import { actionableCards, annualCost, deletedBillableBytes, type KpiCardId } from './actionableCards'

interface Props {
  overview: StorageOverview
  delay?: number
}

export function KpiCards({ overview, delay = 0 }: Props) {
  const t = useTranslation()
  const { sharePoint, cost, archive } = overview
  const money = (amount: number) => formatMoney(amount, cost.currency)
  const rate = money(cost.ratePerGb)

  const card = (id: KpiCardId): ReactNode => {
    switch (id) {
      case 'storageUsed':
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.usedToday')}
            value={formatBytes(sharePoint.usedBytes)}
            color={P365.navy}
            information={
              sharePoint.entitledBytes === null
                ? t('storageOptimisation.kpi.usedEntitlementUnknown')
                : t('storageOptimisation.kpi.usedOfEntitled', {
                    used: formatBytes(sharePoint.usedBytes),
                    entitled: formatBytes(sharePoint.entitledBytes),
                  })
            }
          />
        )
      case 'overEntitlement':
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.overEntitlement')}
            value={formatBytes(sharePoint.overageBytes ?? 0)}
            color={P365.red}
            information={t('storageOptimisation.kpi.overEntitlementHint', {
              cost: money(annualCost(sharePoint.overageBytes ?? 0, cost.ratePerGb)),
            })}
          />
        )
      case 'forecastExhaustion': {
        const forecast = forecastCard(overview, t)
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.forecast')}
            value={forecast.value}
            color={RISK_COLOR[forecast.status]}
            information={forecast.hint}
          />
        )
      }
      case 'costOfNothing':
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.costOfNothing')}
            value={money(cost.cumulativeYear3)}
            color={HEALTH_COLOR[cost.growthAnnualStatus]}
            information={costHint(overview, rate, t)}
          />
        )
      case 'archiveCandidates': {
        const sites = t('storageOptimisation.kpi.archivableHint', {
          count: archive.siteCount,
          percent: formatShare(archive.shareOfSharePoint),
          date: formatShortDate(archive.inactiveSince),
        })
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.archivable')}
            value={formatBytes(archive.bytes)}
            color={HEALTH_COLOR[archive.status]}
            information={
              archive.savingApplies && archive.annualSaving > 0
                ? t('storageOptimisation.kpi.archivableSavingHint', { sites, saving: money(archive.annualSaving) })
                : sites
            }
          />
        )
      }
      case 'deletedButBilling': {
        const billable = deletedBillableBytes(overview)
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.deletedButBilling')}
            value={formatBytes(billable)}
            color={P365.orange}
            information={t('storageOptimisation.kpi.deletedButBillingHint', {
              count: sharePoint.deletedButBilling.count,
              cost: money(annualCost(billable, cost.ratePerGb)),
            })}
          />
        )
      }
    }
  }

  const cards = actionableCards(overview)

  return (
    <section
      aria-label={t('storageOptimisation.capacity.title')}
      className="enter-rise flex flex-col gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-p365-grey-500">
        {t('storageOptimisation.capacity.title')}
      </p>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${KPI_GRID_COLUMNS[cards.length]}`}>
        {cards.map(card)}
      </div>
    </section>
  )
}
