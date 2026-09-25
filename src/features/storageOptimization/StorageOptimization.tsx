import { useSettings } from '@/app/useSettings'
import { ReportLoading } from '@/app/ReportLoading'
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
  if (isPending || !data) return <ReportLoading stage="loadingReport" />

  return (
    <div className="flex flex-col gap-6">
      <div className="enter-rise flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-p365-navy">
          {t('reports.storageOptimisation.title')}
        </h1>
        <p className="text-sm text-p365-grey-500">
          {t('storageOptimisation.description')} {t('app.dataAsOf', { date: data.reportRefreshDate })}{' '}
          {t('app.reportLagNote')}
        </p>
      </div>
      <KpiCards overview={data} />
      <DistributionSection overview={data} delay={80} />
      <GrowthSection overview={data} delay={160} />
      <OffendersSection overview={data} delay={240} />
    </div>
  )
}
