import { HelpButton } from '@/app/help/HelpButton'
import { formatBytes } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview, TemplateSlice } from '@/types/storage'
import { MonoDoughnut } from '@/design/charts'
import { Legend, PanelDescription, PanelLabel, Panel, Section } from '@/design/primitives'
import { monoColor } from '@/design/theme'
import { OneDrivePoolPanel } from './OneDrivePoolPanel'
import { StorageUsagePanel } from './StorageUsagePanel'

interface Props {
  overview: StorageOverview
  delay?: number
}

function shaded(slices: TemplateSlice[], label: (slice: TemplateSlice) => string) {
  return slices.map((slice, index) => ({
    name: label(slice),
    value: slice.value,
    color: monoColor(index, slices.length),
  }))
}

export function DistributionSection({ overview, delay }: Props) {
  const t = useTranslation()
  const { sharePoint } = overview
  const templates = shaded(sharePoint.byTemplate, (slice) =>
    slice.group === 'other'
      ? t('storageOptimisation.template.other')
      : slice.group === 'notReported'
        ? t('storageOptimisation.template.notReported')
        : slice.name,
  )

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.distribution.title')}
      subtitle={
        sharePoint.siteReportRead && overview.oneDrive.read
          ? t('storageOptimisation.distribution.subtitle')
          : t('storageOptimisation.distribution.subtitlePartial')
      }
      help={<HelpButton topic="storageDistribution" />}
    >
      {sharePoint.read && <StorageUsagePanel overview={overview} />}
      {overview.oneDrive.read && <OneDrivePoolPanel overview={overview} />}

      {sharePoint.siteReportRead && (
        <Panel>
          <PanelLabel>{t('storageOptimisation.template.title')}</PanelLabel>
          <PanelDescription>{t('storageOptimisation.template.subtitle')}</PanelDescription>
          <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:items-center">
            <MonoDoughnut
              slices={templates}
              formatValue={formatBytes}
              ariaLabel={t('storageOptimisation.template.title')}
            />
            <Legend
              className="max-w-3xl"
              columns={3}
              items={templates.map((slice) => ({
                name: slice.name,
                color: slice.color,
                detail: formatBytes(slice.value),
              }))}
            />
          </div>
        </Panel>
      )}
    </Section>
  )
}
