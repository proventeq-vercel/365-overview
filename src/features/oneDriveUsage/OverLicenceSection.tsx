import { HelpButton } from '@/app/help/HelpButton'
import { SiteTable } from '@/components/SiteTable'
import { EmptyBlock, Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { OneDriveLicenceGap, OneDriveLimit, StorageOverview } from '@/types/storage'

const OVER_LICENCE_COLUMNS = ['name', 'owner', 'used', 'overEntitlement', 'capacity', 'lastActivity'] as const
const OVER_DRIVE_LIMIT_COLUMNS = ['name', 'owner', 'used', 'overDriveLimit', 'capacity', 'lastActivity'] as const

function subtitle(limit: OneDriveLimit, driveCount: number, t: TranslateFn): string {
  const entitlement = formatBytes(limit.perUserBytes)
  if (limit.basis === 'driveLimit') {
    return t('oneDrive.overLicence.subtitleDriveLimit', {
      limit: entitlement,
      reporting: limit.drivesReporting,
      count: driveCount,
    })
  }
  return limit.basis === 'set'
    ? t('oneDrive.overLicence.subtitleSet', { entitlement })
    : t('oneDrive.overLicence.subtitle', { entitlement })
}

function note(limit: OneDriveLimit, licenceGap: OneDriveLicenceGap | null, t: TranslateFn): string {
  if (limit.basis === 'licences') return t('oneDrive.overLicence.note')
  if (limit.basis === 'driveLimit') {
    return licenceGap === 'noSizedPlan'
      ? t('oneDrive.overLicence.noteDriveLimitNoSizedPlan')
      : t('oneDrive.overLicence.noteDriveLimit')
  }
  if (limit.whenCleared === 'licences') return t('oneDrive.overLicence.noteSet')
  return limit.whenCleared === 'driveLimit'
    ? t('oneDrive.overLicence.noteSetNoEstimate')
    : t('oneDrive.overLicence.noteSetNothing')
}

export function OverLicenceSection({ overview, delay }: { overview: StorageOverview; delay?: number }) {
  const t = useTranslation()
  const { overEntitlement, licenceGap, driveCount } = overview.oneDrive
  if (overEntitlement === null) return null
  const { limit } = overEntitlement
  const byDriveLimit = limit.basis === 'driveLimit'
  const label = byDriveLimit ? t('oneDrive.overLicence.labelDriveLimit') : t('oneDrive.overLicence.label')

  return (
    <Section
      title={byDriveLimit ? t('oneDrive.overLicence.titleDriveLimit') : t('oneDrive.overLicence.title')}
      help={<HelpButton topic="oneDriveOverLicence" />}
      subtitle={subtitle(limit, driveCount, t)}
      delay={delay}
    >
      <Panel>
        <PanelLabel>{label}</PanelLabel>
        {overEntitlement.count > 0 ? (
          <SiteTable
            rows={overEntitlement.drives}
            poolUsedBytes={overview.offenders.poolUsedBytes}
            columns={[...(byDriveLimit ? OVER_DRIVE_LIMIT_COLUMNS : OVER_LICENCE_COLUMNS)]}
            label={label}
            nameHeader={t('oneDrive.table.driveHeader')}
            nameHelp={t('table.column.help.drive')}
            nameMask={overview.caveats.nameMask}
          />
        ) : (
          <EmptyBlock>{t('oneDrive.overLicence.empty', { entitlement: formatBytes(limit.perUserBytes) })}</EmptyBlock>
        )}
        <PanelDescription>{note(limit, licenceGap, t)}</PanelDescription>
      </Panel>
    </Section>
  )
}
