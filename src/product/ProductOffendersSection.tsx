import { formatBytes, formatNumber } from '@/lib/format'
import { COPY } from '@/sections/StorageOptimization/copy'
import type { StorageOverview } from '@/types/storage'
import { FacetBars, MonoBarChart } from './charts'
import {
  Legend,
  PanelDescription,
  PanelLabel,
  ProductPanel,
  ProductSection,
  SplitGrid,
} from './primitives'
import { P365 } from './theme'

interface Props {
  overview: StorageOverview
}

export function ProductOffendersSection({ overview }: Props) {
  const { topConsumers, topSites, topDrives, retained } = overview.offenders

  return (
    <ProductSection title="Main offenders" subtitle="The sites and drives driving the most storage">
      <ProductPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PanelLabel>Biggest sites & OneDrives by storage</PanelLabel>
          <Legend items={[{ name: 'Storage', color: P365.blue }]} />
        </div>
        <MonoBarChart
          data={topConsumers.map((slice) => ({ ...slice }))}
          formatValue={formatBytes}
          ariaLabel="Biggest sites & OneDrives by storage"
        />
      </ProductPanel>

      <SplitGrid className="lg:grid-cols-2">
        <ProductPanel>
          <PanelLabel>Top SharePoint sites by storage</PanelLabel>
          <FacetBars items={topSites} formatValue={formatBytes} emptyText="No results" />
        </ProductPanel>
        <ProductPanel>
          <PanelLabel>Top OneDrives by storage</PanelLabel>
          <FacetBars items={topDrives} formatValue={formatBytes} emptyText="No results" />
        </ProductPanel>
      </SplitGrid>

      {retained.count > 0 && (
        <ProductPanel>
          <PanelLabel>Deleted but still billing</PanelLabel>
          <p className="tabular text-2xl font-bold text-p365-navy">{formatBytes(retained.bytes)}</p>
          <PanelDescription>
            {formatNumber(retained.count)} sites and drives are deleted but still consuming quota
            under retention.
          </PanelDescription>
        </ProductPanel>
      )}
      <PanelDescription>{COPY.offendersFooter}</PanelDescription>
    </ProductSection>
  )
}
