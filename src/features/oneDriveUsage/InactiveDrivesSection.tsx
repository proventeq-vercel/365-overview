import { HelpButton } from '@/app/help/HelpButton'
import { FacetBars } from '@/design/charts'
import { Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { StatCard } from '@/design/StatCard'
import { P365 } from '@/design/theme'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { formatBytes, formatLongDate, formatLongMonthYear } from '@/lib/format'
import type { InactiveDriveBandTotal, OneDriveAttention, StorageOverview } from '@/types/storage'

function bandLabel(band: InactiveDriveBandTotal, t: TranslateFn): string {
  if (band.fromYears === null) return t('oneDrive.attention.band.never')
  if (band.toYears === null) return t('oneDrive.attention.band.older', { years: band.fromYears })
  return t('oneDrive.attention.band.years', { from: band.fromYears, to: band.toYears })
}

function UnlicensedCard({ attention }: { attention: OneDriveAttention }) {
  const t = useTranslation()
  const { unlicensed } = attention
  if (unlicensed.basis === 'noActivity') {
    return (
      <StatCard
        label={t('oneDrive.attention.noActivity', { days: unlicensed.days })}
        value={formatBytes(unlicensed.bytes)}
        color={unlicensed.count > 0 ? P365.red : P365.grey400}
        information={t('oneDrive.attention.noActivityHint', {
          count: unlicensed.count,
          since: formatLongDate(unlicensed.since),
          years: attention.inactiveYears,
          days: unlicensed.days,
        })}
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
  if (attention === null) return null
  const { inactive, inactiveYears, inactiveSince } = attention
  const inactiveValues = { count: inactive.count, date: formatLongMonthYear(inactiveSince) }
  const quiet = attention.unlicensed.basis === 'noActivity'

  return (
    <Section
      title={quiet ? t('oneDrive.attention.titleNoActivity') : t('oneDrive.attention.title')}
      subtitle={quiet ? t('oneDrive.attention.subtitleNoActivity') : t('oneDrive.attention.subtitle')}
      help={<HelpButton topic="oneDriveInactive" />}
      delay={delay}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={t('oneDrive.attention.inactive')}
          value={formatBytes(inactive.bytes)}
          color={inactive.count > 0 ? P365.blue : P365.grey400}
          information={
            quiet
              ? t('oneDrive.attention.inactiveHintNoLicences', inactiveValues)
              : t('oneDrive.attention.inactiveHint', inactiveValues)
          }
        />
        <StatCard
          label={t('oneDrive.attention.deleted')}
          value={formatBytes(deletedButBilling.bytes)}
          color={deletedButBilling.count > 0 ? P365.yellow : P365.grey400}
          information={t('oneDrive.attention.deletedHint', { count: deletedButBilling.count })}
        />
        <UnlicensedCard attention={attention} />
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
          ariaLabel={t('oneDrive.attention.bandsTitle')}
        />
      </Panel>
    </Section>
  )
}
