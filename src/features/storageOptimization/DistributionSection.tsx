import { formatBytes, formatPercent } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import type { Slice, StorageOverview } from '@/types/storage'
import { MonoDoughnut } from '@/design/charts'
import {
  EmptyBlock,
  Legend,
  PanelDescription,
  PanelLabel,
  Panel,
  Section,
  SplitGrid,
} from '@/design/primitives'
import { P365, monoColor } from '@/design/theme'

interface Props {
  overview: StorageOverview
  delay?: number
}

function shaded(slices: Slice[]) {
  return slices.map((slice, index) => ({ ...slice, color: monoColor(index, slices.length) }))
}

function ShareDoughnut({ slices, ariaLabel }: { slices: Slice[]; ariaLabel: string }) {
  const coloured = shaded(slices)
  return (
    <>
      <MonoDoughnut slices={coloured} formatValue={formatBytes} ariaLabel={ariaLabel} />
      <Legend
        className="mt-3"
        columns={2}
        items={coloured.map((slice) => ({
          name: slice.name,
          color: slice.color,
          detail: formatBytes(slice.value),
        }))}
      />
    </>
  )
}

export function DistributionSection({ overview, delay }: Props) {
  const t = useTranslation()
  const { sharePoint, oneDrive, caveats } = overview
  const workloadSlices = [
    ...sharePoint.byWorkload,
    { name: t('storageOptimisation.workload.oneDrive'), value: oneDrive.usedBytes },
  ]

  return (
    <Section
      delay={delay}
      title={t('storageOptimisation.distribution.title')}
      subtitle={t('storageOptimisation.distribution.subtitle')}
    >
      <SplitGrid className="lg:grid-cols-2">
        <Panel>
          <PanelLabel>{t('storageOptimisation.quota.title')}</PanelLabel>
          <PanelDescription>{t('storageOptimisation.quota.scopeNote')}</PanelDescription>
          {sharePoint.usedPercentage === null ||
          sharePoint.remainingBytes === null ||
          sharePoint.entitledBytes === null ? (
            <EmptyBlock>{t('storageOptimisation.quota.entitlementUnknown')}</EmptyBlock>
          ) : (
            <MonoDoughnut
              ariaLabel={t('storageOptimisation.quota.title')}
              formatValue={formatBytes}
              slices={[
                { name: t('storageOptimisation.quota.used'), value: sharePoint.usedBytes, color: P365.blue },
                {
                  name: t('storageOptimisation.quota.remaining'),
                  value: sharePoint.remainingBytes,
                  color: P365.grey100,
                },
              ]}
              center={
                <>
                  <span className="tabular text-2xl font-bold text-p365-navy">
                    {formatPercent(sharePoint.usedPercentage, 1)}
                  </span>
                  <span className="text-xs text-p365-grey-500">
                    {formatBytes(sharePoint.usedBytes)} / {formatBytes(sharePoint.entitledBytes)}
                  </span>
                </>
              }
            />
          )}
          {caveats.entitlementIsEstimated && sharePoint.entitledBytes !== null && (
            <PanelDescription>{t('storageOptimisation.growth.estimatedQuotaNote')}</PanelDescription>
          )}
        </Panel>

        <Panel>
          <PanelLabel>{t('storageOptimisation.workload.title')}</PanelLabel>
          <PanelDescription>{t('storageOptimisation.workload.subtitle')}</PanelDescription>
          <ShareDoughnut slices={workloadSlices} ariaLabel={t('storageOptimisation.workload.title')} />
          <p className="mt-3 text-xs text-p365-grey-500">
            {t('storageOptimisation.workload.groupingNote')}
          </p>
        </Panel>
      </SplitGrid>

      <Panel>
        <PanelLabel>{t('storageOptimisation.template.title')}</PanelLabel>
        <PanelDescription>{t('storageOptimisation.template.subtitle')}</PanelDescription>
        <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:items-center">
          <MonoDoughnut
            slices={shaded(sharePoint.byTemplate)}
            formatValue={formatBytes}
            ariaLabel={t('storageOptimisation.template.title')}
          />
          <Legend
            className="max-w-3xl"
            columns={3}
            items={shaded(sharePoint.byTemplate).map((slice) => ({
              name: slice.name,
              color: slice.color,
              detail: formatBytes(slice.value),
            }))}
          />
        </div>
      </Panel>
    </Section>
  )
}
