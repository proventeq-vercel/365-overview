import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { SiteTable } from '@/components/SiteTable'
import { formatBytes, formatNumber } from '@/lib/format'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { COPY } from './copy'
import { Panel, SectionShell } from './SectionShell'

const TOP_N = 10

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

function displayName(row: StorageRow): string {
  return row.url.replace(/\/$/, '').split('/').pop() || row.ownerDisplayName
}

interface Props {
  overview: StorageOverview
}

export function OffendersSection({ overview }: Props) {
  const { sharePoint, oneDrive } = overview
  const rows = [...sharePoint.sites, ...oneDrive.drives]
  const totalUsedBytes = sharePoint.usedBytes + oneDrive.usedBytes

  const topConsumers = [...rows]
    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
    .slice(0, TOP_N)
    .map((row) => ({ name: displayName(row), used: row.storageUsedBytes }))

  const retainedCount =
    sharePoint.deletedButBilling.count + oneDrive.deletedButBilling.count
  const retainedBytes =
    sharePoint.deletedButBilling.bytes + oneDrive.deletedButBilling.bytes

  return (
    <SectionShell
      title="Main offenders"
      subtitle="The sites and drives driving the most storage"
      className="delay-200"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Biggest sites &amp; OneDrives by storage">
            <BarBreakdown
              data={topConsumers}
              categoryKey="name"
              valueKeys={[{ key: 'used', name: 'Storage used' }]}
              valueFormatter={formatBytes}
              ariaLabel="Biggest sites &amp; OneDrives by storage"
            />
          </Panel>
        </div>

        {retainedCount > 0 && (
          <Panel title="Deleted but still billing">
            <p className="text-3xl font-bold tabular text-ink">
              {formatBytes(retainedBytes)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(retainedCount)} sites and drives are deleted but still
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
