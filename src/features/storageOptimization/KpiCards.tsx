import { useRef, type ReactNode } from 'react'
import { formatBytes, formatShare, formatShortDate } from '@/lib/format'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { costHint, forecastCard, storageUsedSource } from './forecastCopy'
import { formatMoney } from './money'
import type { StorageOverview } from '@/types/storage'
import { StatCard } from '@/design/StatCard'
import { kpiGridColumns } from '@/design/kpiGrid'
import { HEALTH_COLOR, P365, RISK_COLOR } from '@/design/theme'
import { SettingsLink } from '@/app/SettingsLink'
import { useSettingsDialog } from '@/app/useSettingsDialog'
import { actionableCards, type DeletedStorageCard, type KpiCard } from './actionableCards'

function deletedHeld(deleted: DeletedStorageCard, t: TranslateFn): string {
  const values = { sites: deleted.siteCount, oneDrives: deleted.oneDriveCount }
  if (deleted.oneDriveCount === 0) return t('storageOptimisation.kpi.deletedHeldSites', values)
  if (deleted.siteCount === 0) return t('storageOptimisation.kpi.deletedHeldOneDrives', values)
  return t('storageOptimisation.kpi.deletedHeldBoth', values)
}

function deletedBillingHint(deleted: DeletedStorageCard, cost: string, t: TranslateFn): string {
  switch (deleted.billing) {
    case 'billed':
      return t('storageOptimisation.kpi.deletedBilled', { billable: formatBytes(deleted.billableBytes), cost })
    case 'underEntitlement':
      return t('storageOptimisation.kpi.deletedUnderEntitlement', { headroom: formatBytes(deleted.headroomBytes) })
    case 'atEntitlement':
      return t('storageOptimisation.kpi.deletedAtEntitlement')
    case 'entitlementUnknown':
      return t('storageOptimisation.kpi.deletedNoEntitlement')
    case 'outsidePool':
      return t('storageOptimisation.kpi.deletedOutsidePool')
  }
}

interface Props {
  overview: StorageOverview
  delay?: number
}

export function KpiCards({ overview, delay = 0 }: Props) {
  const t = useTranslation()
  const { sharePoint, cost, archive } = overview
  const money = (amount: number) => formatMoney(amount, cost.currency)
  const rate = money(cost.ratePerGb)
  const region = useRef<HTMLElement>(null)
  const { openSettings, dialog } = useSettingsDialog(region)

  const storageUsedInformation = (): ReactNode =>
    sharePoint.entitledBytes === null ? (
      <>
        {t('storageOptimisation.kpi.usedNoEntitlement')} ·{' '}
        <SettingsLink onOpen={openSettings('entitlement')}>{t('storageOptimisation.kpi.enterEntitlement')}</SettingsLink>
      </>
    ) : (
      <>
        {t('storageOptimisation.kpi.usedOfEntitled', {
          used: formatBytes(sharePoint.usedBytes),
          entitled: formatBytes(sharePoint.entitledBytes),
        })}
        {sharePoint.overageBytes !== null && sharePoint.overageBytes > 0 && (
          <>
            {' · '}
            <span className="font-semibold" style={{ color: P365.red }}>
              {t('storageOptimisation.kpi.usedOver', { over: formatBytes(sharePoint.overageBytes) })}
            </span>
          </>
        )}
        {overview.caveats.entitlementIsEstimated && ` · ${t('storageOptimisation.kpi.usedEstimated')}`}
      </>
    )

  const card = (kpi: KpiCard): ReactNode => {
    const id = kpi.id
    switch (kpi.id) {
      case 'storageUsed': {
        const source = storageUsedSource(overview, t)
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.usedToday')}
            value={formatBytes(sharePoint.usedBytes)}
            color={P365.navy}
            information={
              <>
                {storageUsedInformation()}
                {source !== null && <span className="mt-1 block">{source}</span>}
              </>
            }
          />
        )
      }
      case 'overEntitlement':
        return (
          <StatCard
            key={id}
            label={t('storageOptimisation.kpi.overEntitlement')}
            value={formatBytes(kpi.overageBytes)}
            color={P365.red}
            information={t('storageOptimisation.kpi.overEntitlementHint', { cost: money(kpi.annualCost) })}
          />
        )
      case 'forecastExhaustion': {
        const forecast = forecastCard(kpi.exhaustionDate, overview, t)
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
            color={HEALTH_COLOR[cost.cumulativeYear3Status]}
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
              <>
                {archive.savingApplies && archive.annualSaving > 0
                  ? t('storageOptimisation.kpi.archivableSavingHint', { sites, saving: money(archive.annualSaving) })
                  : sites}
                <span className="mt-1 block">
                  {t('storageOptimisation.kpi.inactivePeriod', { years: archive.inactiveYears })}{' '}
                  <SettingsLink onOpen={openSettings('inactiveYears')}>{t('storageOptimisation.kpi.changeInSettings')}</SettingsLink>
                </span>
              </>
            }
          />
        )
      }
      case 'deletedButBilling': {
        const { deleted } = kpi
        const billed = deleted.billing === 'billed'
        const color = billed ? P365.orange : P365.grey500
        return (
          <StatCard
            key={id}
            label={
              billed ? t('storageOptimisation.kpi.deletedButBilling') : t('storageOptimisation.kpi.deletedStillCounting')
            }
            value={formatBytes(deleted.bytes)}
            color={color}
            information={
              <>
                {deletedHeld(deleted, t)} ·{' '}
                {deletedBillingHint(deleted, money(deleted.billableAnnualCost), t)}
              </>
            }
          />
        )
      }
    }
  }

  const cards = actionableCards(overview)

  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-label={t('storageOptimisation.capacity.title')}
      className="enter-rise flex flex-col gap-2 outline-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-p365-grey-500">
        {t('storageOptimisation.capacity.title')}
      </p>
      <div className={`grid grid-cols-1 gap-4 ${kpiGridColumns(cards.length)}`}>
        {cards.map(card)}
      </div>
      {dialog}
    </section>
  )
}
