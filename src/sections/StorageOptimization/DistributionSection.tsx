import { DonutShare } from '@/components/charts/DonutShare'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { formatBytes } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { COPY } from './copy'
import { Panel, SectionShell, SliceLegend } from './SectionShell'

interface Props {
  overview: StorageOverview
}

export function DistributionSection({ overview }: Props) {
  const { sharePoint, oneDrive, caveats } = overview
  const workloadSlices = [
    ...sharePoint.byWorkload,
    { name: 'OneDrive', value: oneDrive.usedBytes },
  ]

  return (
    <SectionShell
      title="Current storage distribution"
      subtitle="Where storage sits today — quota usage, workload split, and which site types drive the volume"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={COPY.quota.title}>
          {sharePoint.usedPercentage === null || sharePoint.remainingBytes === null ? (
            <p className="text-sm text-muted-foreground">{COPY.quota.entitlementUnknown}</p>
          ) : (
            <>
              <RadialGauge
                value={sharePoint.usedPercentage * 100}
                label={COPY.quota.used}
                ariaLabel={COPY.quota.title}
              />
              <p className="text-sm text-muted-foreground">
                {COPY.quota.used} {formatBytes(sharePoint.usedBytes)} · {COPY.quota.remaining}{' '}
                {formatBytes(Math.max(0, sharePoint.remainingBytes))}
                {caveats.entitlementIsEstimated ? ` · ${COPY.estimatedMarker}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">{COPY.quota.scopeNote}</p>
            </>
          )}
        </Panel>

        <Panel title="Storage by workload">
          <DonutShare
            data={workloadSlices.map((slice) => ({ ...slice }))}
            nameKey="name"
            valueKey="value"
            ariaLabel="Storage by workload"
          />
          <SliceLegend slices={workloadSlices} format={formatBytes} />
          <p className="text-xs text-muted-foreground">{COPY.workloadGroupingNote}</p>
        </Panel>

        <Panel title="Storage by site template">
          <DonutShare
            data={sharePoint.byTemplate.map((slice) => ({ ...slice }))}
            nameKey="name"
            valueKey="value"
            ariaLabel="Storage by site template"
          />
          <SliceLegend slices={sharePoint.byTemplate} format={formatBytes} />
        </Panel>
      </div>
    </SectionShell>
  )
}
