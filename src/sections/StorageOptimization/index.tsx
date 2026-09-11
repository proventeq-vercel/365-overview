import { useState } from 'react'
import { CaveatBanner } from '@/components/CaveatBanner'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/ui/button'
import { useOrg, useStorageOverview } from '@/hooks/useStorageOverview'
import { loadSettings, saveSettings, type ReportSettings } from '@/lib/settings'
import { AccessFailure } from './AccessFailure'
import { DistributionSection } from './DistributionSection'
import { GrowthSection } from './GrowthSection'
import { KpiRow } from './KpiRow'
import { OffendersSection } from './OffendersSection'
import { ReportHeader } from './ReportHeader'
import { COPY } from './copy'

export function StorageOptimization() {
  const [settings, setSettings] = useState<ReportSettings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data, error, isPending } = useStorageOverview(settings)
  const org = useOrg()

  function applySettings(next: ReportSettings) {
    saveSettings(next)
    setSettings(next)
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <AccessFailure error={error} />
      </div>
    )
  }

  if (isPending || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        overview={data}
        tenantName={org.data?.displayName ?? 'Your tenant'}
        settings={settings}
        onSettingsChange={applySettings}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <div className="flex flex-col gap-3">
        {data.caveats.entitlementIsEstimated && (
          <CaveatBanner
            tone="warning"
            action={
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
                Enter the real figure
              </Button>
            }
          >
            {COPY.growth.estimatedQuotaNote}
          </CaveatBanner>
        )}
        {data.caveats.namesAreConcealed && (
          <CaveatBanner tone="info">{COPY.concealedNamesNote}</CaveatBanner>
        )}
      </div>
      <KpiRow overview={data} />
      <DistributionSection overview={data} />
      <GrowthSection overview={data} />
      <OffendersSection overview={data} />
      <footer className="rounded-lg border border-hairline bg-surface px-5 py-4 text-sm text-muted-foreground">
        {COPY.reportFooter}
      </footer>
    </div>
  )
}
