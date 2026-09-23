import { CaveatBanner } from '@/components/CaveatBanner'
import { SiteTable } from '@/components/SiteTable'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { FacetBars, MonoBarChart } from '@/design/charts'
import {
  Legend,
  PanelDescription,
  PanelLabel,
  Panel,
  Section,
  SplitGrid,
} from '@/design/primitives'
import { P365 } from '@/design/theme'

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
  delay?: number
}

export function OffendersSection({ overview, delay }: Props) {
  const t = useTranslation()
  const { rows, tableTotalBytes, topConsumers, topSites, topDrives, retained } =
    overview.offenders

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.offenders.title')}
      subtitle={t('storageOptimisation.offenders.subtitle')}
    >
      {overview.caveats.namesAreConcealed && (
        <CaveatBanner tone="info">{t('storageOptimisation.concealedNamesNote')}</CaveatBanner>
      )}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PanelLabel>{t('storageOptimisation.offenders.biggest')}</PanelLabel>
          <Legend items={[{ name: t('storageOptimisation.offenders.storage'), color: P365.blue }]} />
        </div>
        <MonoBarChart
          data={topConsumers.map((slice) => ({ ...slice }))}
          formatValue={formatBytes}
          ariaLabel={t('storageOptimisation.offenders.biggest')}
        />
      </Panel>

      <SplitGrid className="lg:grid-cols-2">
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.topSites')}</PanelLabel>
          <FacetBars
            items={topSites}
            formatValue={formatBytes}
            emptyText={t('storageOptimisation.offenders.empty')}
          />
        </Panel>
        <Panel>
          <PanelLabel>{t('storageOptimisation.offenders.topDrives')}</PanelLabel>
          <FacetBars
            items={topDrives}
            formatValue={formatBytes}
            emptyText={t('storageOptimisation.offenders.empty')}
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
          shareTotalBytes={tableTotalBytes}
          columns={[...OFFENDER_COLUMNS]}
          label={t('storageOptimisation.offenders.tableLabel')}
        />
      </Panel>
    </Section>
  )
}
