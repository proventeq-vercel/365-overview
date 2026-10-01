import { HelpButton } from '@/app/help/HelpButton'
import { PageHeader } from '@/design/primitives'
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
      <PageHeader
        title={t('reports.storageOptimisation.title')}
        help={<HelpButton topic="storageOptimisation" />}
      >
        {t('storageOptimisation.description')} {t('app.dataAsOf', { date: data.reportRefreshDate })}{' '}
        {t('app.reportLagNote')}
      </PageHeader>
      <DistributionSection overview={data} delay={40} />
      <KpiCards overview={data} delay={120} />
      <GrowthSection overview={data} delay={160} />
      <OffendersSection overview={data} delay={240} />
    </div>
  )
}
