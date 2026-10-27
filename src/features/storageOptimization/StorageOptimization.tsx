import { HelpButton } from '@/app/help/HelpButton'
import { PageHeader } from '@/design/primitives'
import { useSettings } from '@/app/useSettings'
import { ReportDate } from '@/app/ReportDate'
import { ReportLoading } from '@/app/ReportLoading'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageGrowth } from '@/hooks/useStorageGrowth'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { UnreadReports } from '@/components/UnreadReports'
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
  const growth = useStorageGrowth(data)

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportLoading stage="loadingReport" />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('reports.storageOptimisation.title')}
        help={<HelpButton topic="storageOptimisation" />}
      >
        {t('storageOptimisation.description')} <ReportDate date={data.reportRefreshDate} />
      </PageHeader>
      <UnreadReports reports={data.caveats.unreadReports} />
      {data.sharePoint.read && <KpiCards overview={data} delay={40} />}
      <DistributionSection overview={data} delay={120} />
      {data.sharePoint.read && <GrowthSection overview={data} delay={160} />}
      {data.offenders.read && <OffendersSection overview={data} growth={growth} delay={240} />}
    </div>
  )
}
