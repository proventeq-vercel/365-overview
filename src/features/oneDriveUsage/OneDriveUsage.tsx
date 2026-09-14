import { useSettings } from '@/app/useSettings'
import { CaveatBanner } from '@/components/CaveatBanner'
import { SiteTable } from '@/components/SiteTable'
import { FacetBars } from '@/design/charts'
import { Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { ReportSkeleton } from '@/design/ReportSkeleton'
import { AccessFailure } from '@/features/storageOptimization/AccessFailure'
import { COPY as STORAGE_COPY } from '@/features/storageOptimization/copy'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { formatBytes } from '@/lib/format'
import { COPY } from './copy'
import { OneDriveKpiCards } from './OneDriveKpiCards'

const DRIVE_COLUMNS = ['name', 'owner', 'used', 'capacity', 'files', 'active', 'lastActivity'] as const

export function OneDriveUsage() {
  const { settings } = useSettings()
  const { data, error, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportSkeleton />

  const { oneDrive, offenders, caveats } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="enter-rise flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-p365-navy">{COPY.title}</h1>
        <p className="text-sm text-p365-grey-500">
          {COPY.description} Data as of {data.reportRefreshDate}. {STORAGE_COPY.reportLagNote}
        </p>
      </div>
      <OneDriveKpiCards overview={data} />
      <Section title={COPY.top.title} subtitle={COPY.top.subtitle} delay={80}>
        <Panel>
          <FacetBars items={offenders.topDrives} formatValue={formatBytes} emptyText={COPY.top.empty} />
          <PanelDescription>{COPY.allocationNote}</PanelDescription>
        </Panel>
      </Section>
      <Section title={COPY.table.title} subtitle={COPY.table.subtitle} delay={160}>
        {caveats.namesAreConcealed && (
          <CaveatBanner tone="info">{STORAGE_COPY.concealedNamesNote}</CaveatBanner>
        )}
        <Panel>
          <PanelLabel>{COPY.table.label}</PanelLabel>
          <SiteTable
            rows={oneDrive.drives}
            totalUsedBytes={oneDrive.usedBytes}
            columns={[...DRIVE_COLUMNS]}
            label={COPY.table.label}
            nameHeader="Drive"
          />
        </Panel>
      </Section>
    </div>
  )
}
