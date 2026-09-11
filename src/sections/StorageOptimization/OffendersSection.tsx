import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { SiteTable } from '@/components/SiteTable'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { Panel, SectionShell } from './SectionShell'

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
}

export function OffendersSection({ overview }: Props) {
  const { rows, totalUsedBytes, topConsumers, retained } = overview.offenders

  return (
    <SectionShell
      title="Main offenders"
      subtitle="The sites and drives driving the most storage"
      className="delay-200"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Biggest sites & OneDrives by storage">
            <BarBreakdown
              data={topConsumers.map((slice) => ({ ...slice }))}
              categoryKey="name"
              valueKeys={[{ key: 'value', name: 'Storage used' }]}
              valueFormatter={formatBytes}
              ariaLabel="Biggest sites & OneDrives by storage"
            />
          </Panel>
        </div>

        {retained.count > 0 && (
          <Panel title="Deleted but still billing">
            <p className="text-3xl font-bold tabular text-ink">
              {formatBytes(retained.bytes)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(retained.count)} sites and drives are deleted but still
              consuming quota under retention.
            </p>
          </Panel>
        )}
      </div>

      <SiteTable
        rows={rows}
        totalUsedBytes={totalUsedBytes}
        columns={[...OFFENDER_COLUMNS]}
        label="Sites and drives"
      />
      <p className="text-sm text-muted-foreground">{COPY.offendersFooter}</p>
    </SectionShell>
  )
}
