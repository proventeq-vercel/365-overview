import { HelpButton } from '@/app/help/HelpButton'
import { NameCaveats } from '@/components/NameCaveats'
import { SiteTable } from '@/components/SiteTable'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageGrowth, StorageOverview } from '@/types/storage'
import { FacetBars } from '@/design/charts'
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

interface Props {
  overview: StorageOverview
  growth: StorageGrowth | undefined
  delay?: number
}

export function OffendersSection({ overview, growth, delay }: Props) {
  const t = useTranslation()
  const { rows, poolUsedBytes, topSites, topDrives, retained } = overview.offenders

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.offenders.title')}
      subtitle={t('storageOptimisation.offenders.subtitle')}
      help={<HelpButton topic="mainOffenders" />}
    >
      <NameCaveats caveats={overview.caveats} />
      <FastestGrowingPanel growth={growth} nameMask={overview.caveats.nameMask} />

      <SplitGrid className="lg:grid-cols-2">
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.topSites')}</PanelLabel>
          <FacetBars
            items={topSites}
            formatValue={formatBytes}
            emptyText={t('storageOptimisation.offenders.empty')}
            nameMask={overview.caveats.nameMask}
          />
        </Panel>
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.topDrives')}</PanelLabel>
          <FacetBars
            items={topDrives}
            formatValue={formatBytes}
            emptyText={t('storageOptimisation.offenders.empty')}
            nameMask={overview.caveats.nameMask}
          />
        </Panel>
      </SplitGrid>

      {retained.count > 0 && (
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.retained')}</PanelLabel>
          <p className="tabular text-2xl font-bold text-p365-navy">{formatBytes(retained.bytes)}</p>
          <PanelDescription>
            {t('storageOptimisation.offenders.retainedNote', { count: formatNumber(retained.count) })}
          </PanelDescription>
        </Panel>
      )}

      <Panel>
        <PanelLabel>{t('storageOptimisation.offenders.all')}</PanelLabel>
        <PanelDescription>{t('storageOptimisation.offenders.allSubtitle')}</PanelDescription>
        <SiteTable
          rows={rows}
          poolUsedBytes={poolUsedBytes}
          columns={[...OFFENDER_COLUMNS]}
          label={t('storageOptimisation.offenders.tableLabel')}
          nameMask={overview.caveats.nameMask}
        />
      </Panel>
    </Section>
  )
}
