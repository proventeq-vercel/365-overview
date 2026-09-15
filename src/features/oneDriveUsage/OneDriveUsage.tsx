import { useSettings } from '@/app/useSettings'
import { CaveatBanner } from '@/components/CaveatBanner'
import { SiteTable } from '@/components/SiteTable'
import { FacetBars } from '@/design/charts'
import { Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { ReportSkeleton } from '@/design/ReportSkeleton'
import { AccessFailure } from '@/features/storageOptimization/AccessFailure'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import { OneDriveKpiCards } from './OneDriveKpiCards'

const DRIVE_COLUMNS = ['name', 'owner', 'used', 'capacity', 'files', 'active', 'lastActivity'] as const

export function OneDriveUsage() {
  const t = useTranslation()
  const { settings } = useSettings()
  const { data, error, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportSkeleton />

  const { oneDrive, offenders, caveats } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="enter-rise flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-p365-navy">{t('reports.oneDriveUsage.title')}</h1>
        <p className="text-sm text-p365-grey-500">
          {t('oneDrive.description')} {t('app.dataAsOf', { date: data.reportRefreshDate })}{' '}
          {t('app.reportLagNote')}
        </p>
      </div>
      <OneDriveKpiCards overview={data} />
      <Section title={t('oneDrive.top.title')} subtitle={t('oneDrive.top.subtitle')} delay={80}>
        <Panel>
          <FacetBars
            items={offenders.topDrives}
            formatValue={formatBytes}
            emptyText={t('oneDrive.top.empty')}
          />
          <PanelDescription>{t('oneDrive.allocationNote')}</PanelDescription>
        </Panel>
      </Section>
      <Section
        title={t('oneDrive.table.title')}
        subtitle={t('oneDrive.table.subtitle', { retained: oneDrive.deletedButBilling.count })}
        delay={160}
      >
        {caveats.namesAreConcealed && (
          <CaveatBanner tone="info">{t('storageOptimisation.concealedNamesNote')}</CaveatBanner>
        )}
        <Panel>
          <PanelLabel>{t('oneDrive.table.label')}</PanelLabel>
          <SiteTable
            rows={oneDrive.drives}
            totalUsedBytes={oneDrive.usedBytes}
            columns={[...DRIVE_COLUMNS]}
            label={t('oneDrive.table.label')}
            nameHeader={t('oneDrive.table.driveHeader')}
            nameHelp={t('table.column.help.drive')}
          />
        </Panel>
      </Section>
    </div>
  )
}
