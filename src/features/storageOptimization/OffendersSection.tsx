import { HelpButton } from '@/app/help/HelpButton'
import { NameCaveats } from '@/components/NameCaveats'
import { SiteTable } from '@/components/SiteTable'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageGrowth, StorageOverview } from '@/types/storage'
import { FacetBars } from '@/design/charts'
import { POOL_COLOR } from '@/design/theme'
import { PanelDescription, PanelLabel, Panel, Section, SplitGrid } from '@/design/primitives'
import { FastestGrowingPanel } from './FastestGrowingPanel'

const OFFENDER_COLUMNS = [
  'name',
  'owner',
  'used',
  'share',
  'files',
  'active',
  'lastActivity',
  'template',
] as const

const DRIVE_COLUMNS = OFFENDER_COLUMNS.filter((column) => column !== 'template')

type Listed = 'both' | 'sites' | 'drives'

function listedCopy(listed: Listed, t: TranslateFn) {
  return {
    both: {
      subtitle: t('storageOptimisation.offenders.subtitle'),
      all: t('storageOptimisation.offenders.all'),
      allSubtitle: t('storageOptimisation.offenders.allSubtitle'),
      tableLabel: t('storageOptimisation.offenders.tableLabel'),
    },
    sites: {
      subtitle: t('storageOptimisation.offenders.subtitleSites'),
      all: t('storageOptimisation.offenders.allSites'),
      allSubtitle: t('storageOptimisation.offenders.allSitesSubtitle'),
      tableLabel: t('storageOptimisation.offenders.tableLabelSites'),
    },
    drives: {
      subtitle: t('storageOptimisation.offenders.subtitleDrives'),
      all: t('storageOptimisation.offenders.allDrives'),
      allSubtitle: t('storageOptimisation.offenders.allDrivesSubtitle'),
      tableLabel: t('storageOptimisation.offenders.tableLabelDrives'),
    },
  }[listed]
}

interface Props {
  overview: StorageOverview
  growth: StorageGrowth | undefined
  delay?: number
}

export function OffendersSection({ overview, growth, delay }: Props) {
  const t = useTranslation()
  const { rows, poolUsedBytes, topSites, topDrives, retained } = overview.offenders
  const { siteReportRead } = overview.sharePoint
  const { accountReportRead } = overview.oneDrive
  const listed: Listed = siteReportRead && accountReportRead ? 'both' : siteReportRead ? 'sites' : 'drives'
  const copy = listedCopy(listed, t)

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.offenders.title')}
      subtitle={copy.subtitle}
      help={<HelpButton topic="mainOffenders" />}
    >
      <NameCaveats caveats={overview.caveats} />
      <FastestGrowingPanel growth={growth} nameMask={overview.caveats.nameMask} />

      <SplitGrid className={listed === 'both' ? 'lg:grid-cols-2' : ''}>
        {siteReportRead && (
          <Panel>
            <PanelLabel>{t('storageOptimisation.offenders.topSites')}</PanelLabel>
            <FacetBars
              items={topSites}
              ariaLabel={t('storageOptimisation.offenders.topSites')}
              color={POOL_COLOR.SharePoint}
              formatValue={formatBytes}
              emptyText={t('storageOptimisation.offenders.empty')}
              nameMask={overview.caveats.nameMask}
            />
          </Panel>
        )}
        {accountReportRead && (
          <Panel>
            <PanelLabel>{t('storageOptimisation.offenders.topDrives')}</PanelLabel>
            <FacetBars
              items={topDrives}
              ariaLabel={t('storageOptimisation.offenders.topDrives')}
              color={POOL_COLOR.OneDrive}
              formatValue={formatBytes}
              emptyText={t('storageOptimisation.offenders.empty')}
              nameMask={overview.caveats.nameMask}
            />
          </Panel>
        )}
      </SplitGrid>

      {retained !== null && retained.count > 0 && (
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.retained')}</PanelLabel>
          <p className="tabular text-2xl font-bold text-p365-navy">{formatBytes(retained.bytes)}</p>
          <PanelDescription>
            {t('storageOptimisation.offenders.retainedNote', { count: formatNumber(retained.count) })}
          </PanelDescription>
        </Panel>
      )}

      <Panel>
        <PanelLabel>{copy.all}</PanelLabel>
        <PanelDescription>{copy.allSubtitle}</PanelDescription>
        <SiteTable
          rows={rows}
          poolUsedBytes={poolUsedBytes}
          columns={listed === 'drives' ? DRIVE_COLUMNS : [...OFFENDER_COLUMNS]}
          label={copy.tableLabel}
          nameMask={overview.caveats.nameMask}
          nameHeader={listed === 'drives' ? t('oneDrive.table.driveHeader') : undefined}
          nameHelp={listed === 'drives' ? t('table.column.help.drive') : undefined}
        />
      </Panel>
    </Section>
  )
}
