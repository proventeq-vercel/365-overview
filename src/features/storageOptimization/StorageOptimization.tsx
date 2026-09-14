import { useSettings } from '@/app/useSettings'
import { ReportSkeleton } from '@/design/ReportSkeleton'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { AccessFailure } from './AccessFailure'
import { COPY } from './copy'
import { DistributionSection } from './DistributionSection'
import { GrowthSection } from './GrowthSection'
import { KpiCards } from './KpiCards'
import { OffendersSection } from './OffendersSection'

export function StorageOptimization() {
  const { settings } = useSettings()
  const { data, error, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div className="enter-rise flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-p365-navy">Storage Optimisation</h1>
        <p className="text-sm text-p365-grey-500">
          A consolidated summary of tenant storage — where it sits today, where it is heading,
          and what drives it. Data as of {data.reportRefreshDate}. {COPY.reportLagNote}
        </p>
      </div>
      <KpiCards overview={data} />
      <DistributionSection overview={data} delay={80} />
      <GrowthSection overview={data} delay={160} />
      <OffendersSection overview={data} delay={240} />
    </div>
  )
}
