import { HelpButton } from '@/app/help/HelpButton'
import { FacetBars } from '@/design/charts'
import { Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { StatCard } from '@/design/StatCard'
import { P365 } from '@/design/theme'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { formatBytes, formatLongMonthYear } from '@/lib/format'
import type { InactiveDriveBandTotal, OneDriveAttention, StorageOverview } from '@/types/storage'

function bandLabel(band: InactiveDriveBandTotal, t: TranslateFn): string {
  if (band.fromYears === null) return t('oneDrive.attention.band.never')
  if (band.toYears === null) return t('oneDrive.attention.band.older', { years: band.fromYears })
  return t('oneDrive.attention.band.years', { from: band.fromYears, to: band.toYears })
}

function UnlicensedCard({ unlicensed }: { unlicensed: OneDriveAttention['unlicensed'] }) {
  const t = useTranslation()
  if (unlicensed === null) {
    return (
      <StatCard
        label={t('oneDrive.attention.unlicensed')}
        value={t('storageOptimisation.kpi.unknown')}
        color={P365.grey400}
        information={t('oneDrive.attention.unlicensedUnknown')}
      />
    )
  }
  return (
    <StatCard
      label={t('oneDrive.attention.unlicensed')}
      value={formatBytes(unlicensed.bytes)}
      color={unlicensed.count > 0 ? P365.red : P365.grey400}
      information={t('oneDrive.attention.unlicensedHint', { count: unlicensed.count, notListed: unlicensed.notListed })}
    />
  )
}

export function InactiveDrivesSection({ overview, delay }: { overview: StorageOverview; delay?: number }) {
  const t = useTranslation()
  const { attention, deletedButBilling } = overview.oneDrive
  const { inactive, inactiveYears, inactiveSince } = attention
  const inactiveValues = { count: inactive.count, date: formatLongMonthYear(inactiveSince) }

  return (
    <Section
      title={t('oneDrive.attention.title')}
      subtitle={t('oneDrive.attention.subtitle')}
      help={<HelpButton topic="oneDriveInactive" />}
      delay={delay}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={t('oneDrive.attention.inactive')}
          value={formatBytes(inactive.bytes)}
          color={inactive.count > 0 ? P365.yellow : P365.grey400}
          information={
            attention.unlicensed === null
              ? t('oneDrive.attention.inactiveHintUnknown', inactiveValues)
              : t('oneDrive.attention.inactiveHint', inactiveValues)
          }
        />
        <StatCard
          label={t('oneDrive.attention.deleted')}
          value={formatBytes(deletedButBilling.bytes)}
          color={deletedButBilling.count > 0 ? P365.orange : P365.grey400}
          information={t('oneDrive.attention.deletedHint', { count: deletedButBilling.count })}
        />
        <UnlicensedCard unlicensed={attention.unlicensed} />
      </div>
      <Panel>
        <PanelLabel>{t('oneDrive.attention.bandsTitle')}</PanelLabel>
        <PanelDescription>{t('oneDrive.attention.bandsSubtitle', { count: inactive.count })}</PanelDescription>
        <FacetBars
          items={inactive.bands
            .filter((band) => band.count > 0)
            .map((band) => ({ name: bandLabel(band, t), value: band.bytes }))}
          formatValue={formatBytes}
          emptyText={t('oneDrive.attention.bandsEmpty', { years: inactiveYears })}
        />
      </Panel>
    </Section>
  )
}
