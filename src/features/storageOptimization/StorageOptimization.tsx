import { useSettings } from '@/app/useSettings'
import { ReportHeading } from '@/design/ReportHeading'
import { ReportSkeleton } from '@/design/ReportSkeleton'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { AccessFailure } from './AccessFailure'
import { DistributionSection } from './DistributionSection'
import { GrowthSection } from './GrowthSection'
import { KpiCards } from './KpiCards'
import { OffendersSection } from './OffendersSection'

export function StorageOptimization() {
  const t = useTranslation()
  const { settings } = useSettings()
  const { data, error, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <ReportHeading
        title={t('reports.storageOptimisation.title')}
        description={t('storageOptimisation.description')}
        reportRefreshDate={data.reportRefreshDate}
      />
      <KpiCards overview={data} />
      <DistributionSection overview={data} delay={80} />
      <GrowthSection overview={data} delay={160} />
      <OffendersSection overview={data} delay={240} />
    </div>
  )
}
