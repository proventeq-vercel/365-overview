import { useState } from 'react'
import { CaveatBanner } from '@/components/CaveatBanner'
import { useOrg, useStorageOverview } from '@/hooks/useStorageOverview'
import { loadSettings, saveSettings, type ReportSettings } from '@/lib/settings'
import { AccessFailure } from './AccessFailure'
import { DistributionSection } from './DistributionSection'
import { GrowthSection } from './GrowthSection'
import { KpiRow } from './KpiRow'
import { OffendersSection } from './OffendersSection'
import { ReportHeader } from './ReportHeader'
import { ReportSkeleton } from './ReportSkeleton'
import { COPY } from './copy'

export function StorageOptimization() {
  const [settings, setSettings] = useState<ReportSettings>(() => loadSettings())
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
    return <ReportSkeleton />
  }

  return (
    <div className="flex flex-col gap-8">
      <ReportHeader
        overview={data}
        tenantName={org.data?.displayName ?? 'Your tenant'}
        settings={settings}
        onSettingsChange={applySettings}
      />
      {data.caveats.namesAreConcealed && (
        <div className="enter-rise">
          <CaveatBanner tone="info">{COPY.concealedNamesNote}</CaveatBanner>
        </div>
      )}
      <KpiRow overview={data} />
      <DistributionSection overview={data} />
      <GrowthSection overview={data} />
      <OffendersSection overview={data} />
    </div>
  )
}
