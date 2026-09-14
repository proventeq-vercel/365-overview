import { CaveatBanner } from '@/components/CaveatBanner'
import { SiteTable } from '@/components/SiteTable'
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
import { COPY } from './copy'

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
  const { rows, totalUsedBytes, topConsumers, topSites, topDrives, retained } =
    overview.offenders

  return (
    <Section delay={delay} title="Main offenders" subtitle="The sites and drives driving the most storage">
      {overview.caveats.namesAreConcealed && (
        <CaveatBanner tone="info">{COPY.concealedNamesNote}</CaveatBanner>
      )}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PanelLabel>Biggest sites & OneDrives by storage</PanelLabel>
          <Legend items={[{ name: 'Storage', color: P365.blue }]} />
        </div>
        <MonoBarChart
          data={topConsumers.map((slice) => ({ ...slice }))}
          formatValue={formatBytes}
          ariaLabel="Biggest sites & OneDrives by storage"
        />
      </Panel>

      <SplitGrid className="lg:grid-cols-2">
        <Panel>
          <PanelLabel>Top SharePoint sites by storage</PanelLabel>
          <FacetBars items={topSites} formatValue={formatBytes} emptyText="No results" />
        </Panel>
        <Panel>
          <PanelLabel>Top OneDrives by storage</PanelLabel>
          <FacetBars items={topDrives} formatValue={formatBytes} emptyText="No results" />
        </Panel>
      </SplitGrid>

      {retained.count > 0 && (
        <Panel>
          <PanelLabel>Deleted but still billing</PanelLabel>
          <p className="tabular text-2xl font-bold text-p365-navy">{formatBytes(retained.bytes)}</p>
          <PanelDescription>
            {formatNumber(retained.count)} sites and drives are deleted but still consuming quota
            under retention.
          </PanelDescription>
        </Panel>
      )}

      <Panel>
        <PanelLabel>All sites and OneDrives</PanelLabel>
        <PanelDescription>Every site and drive in the usage reports, sortable and searchable</PanelDescription>
        <SiteTable
          rows={rows}
          totalUsedBytes={totalUsedBytes}
          columns={[...OFFENDER_COLUMNS]}
          label="Sites and drives"
        />
      </Panel>
    </Section>
  )
}
