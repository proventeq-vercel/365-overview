import { SiteTable } from '@/components/SiteTable'
import { EmptyBlock, Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'

const OVER_LICENCE_COLUMNS = ['name', 'owner', 'used', 'overEntitlement', 'capacity', 'lastActivity'] as const

export function OverLicenceSection({ overview, delay }: { overview: StorageOverview; delay?: number }) {
  const t = useTranslation()
  const { overEntitlement, entitlementPerUserBytes, usedBytes } = overview.oneDrive
  const entitlement = entitlementPerUserBytes === null ? null : formatBytes(entitlementPerUserBytes)

  return (
    <Section
      title={t('oneDrive.overLicence.title')}
      subtitle={
        entitlement === null
          ? t('oneDrive.overLicence.subtitleUnknown')
          : t('oneDrive.overLicence.subtitle', { entitlement })
      }
      delay={delay}
    >
      <Panel>
        <PanelLabel>{t('oneDrive.overLicence.label')}</PanelLabel>
        {overEntitlement === null || entitlement === null ? (
          <EmptyBlock>{t('oneDrive.overLicence.unknown')}</EmptyBlock>
        ) : overEntitlement.count > 0 ? (
          <SiteTable
            rows={overEntitlement.drives}
            totalUsedBytes={usedBytes}
            columns={[...OVER_LICENCE_COLUMNS]}
            label={t('oneDrive.overLicence.label')}
            nameHeader={t('oneDrive.table.driveHeader')}
            nameHelp={t('table.column.help.drive')}
          />
        ) : (
          <EmptyBlock>{t('oneDrive.overLicence.empty', { entitlement })}</EmptyBlock>
        )}
        <PanelDescription>{t('oneDrive.overLicence.note')}</PanelDescription>
      </Panel>
    </Section>
  )
}
