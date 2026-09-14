import { formatBytes, formatPercent } from '@/lib/format'
import { COPY } from '@/sections/StorageOptimization/copy'
import type { Slice, StorageOverview } from '@/types/storage'
import { MonoDoughnut } from './charts'
import {
  EmptyBlock,
  Legend,
  PanelDescription,
  PanelLabel,
  ProductPanel,
  ProductSection,
  SplitGrid,
} from './primitives'
import { P365, monoColor } from './theme'

interface Props {
  overview: StorageOverview
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

export function ProductDistributionSection({ overview }: Props) {
  const { sharePoint, oneDrive, caveats } = overview
  const workloadSlices = [...sharePoint.byWorkload, { name: 'OneDrive', value: oneDrive.usedBytes }]

  return (
    <ProductSection
      title="Current storage distribution"
      subtitle="Where storage sits today — quota usage, workload split, and which site types drive the volume"
    >
      <SplitGrid className="lg:grid-cols-2">
        <ProductPanel>
          <PanelLabel>{COPY.quota.title}</PanelLabel>
          <PanelDescription>{COPY.quota.scopeNote}</PanelDescription>
          {sharePoint.usedPercentage === null ||
          sharePoint.remainingBytes === null ||
          sharePoint.entitledBytes === null ? (
            <EmptyBlock>{COPY.quota.entitlementUnknown}</EmptyBlock>
          ) : (
            <MonoDoughnut
              ariaLabel={COPY.quota.title}
              formatValue={formatBytes}
              slices={[
                { name: COPY.quota.used, value: sharePoint.usedBytes, color: P365.blue },
                { name: COPY.quota.remaining, value: sharePoint.remainingBytes, color: P365.grey100 },
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
            <PanelDescription>{COPY.growth.estimatedQuotaNote}</PanelDescription>
          )}
        </ProductPanel>

        <ProductPanel>
          <PanelLabel>Storage by workload</PanelLabel>
          <PanelDescription>SharePoint, Teams and OneDrive, as reported by Microsoft 365</PanelDescription>
          <ShareDoughnut slices={workloadSlices} ariaLabel="Storage by workload" />
          <p className="mt-3 text-xs text-p365-grey-500">{COPY.workloadGroupingNote}</p>
        </ProductPanel>
      </SplitGrid>

      <ProductPanel>
        <PanelLabel>Storage by site template</PanelLabel>
        <PanelDescription>
          SharePoint storage grouped by the template each site was created from
        </PanelDescription>
        <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:items-center">
          <MonoDoughnut
            slices={shaded(sharePoint.byTemplate)}
            formatValue={formatBytes}
            ariaLabel="Storage by site template"
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
      </ProductPanel>
    </ProductSection>
  )
}
