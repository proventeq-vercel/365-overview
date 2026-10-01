import { useSettings } from '@/app/useSettings'
import { NameCaveats } from '@/components/NameCaveats'
import { SiteTable } from '@/components/SiteTable'
import { FacetBars } from '@/design/charts'
import { HelpButton } from '@/app/help/HelpButton'
import { PageHeader, Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { ReportLoading } from '@/app/ReportLoading'
import { AccessFailure } from '@/features/storageOptimization/AccessFailure'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import { OneDriveKpiCards } from './OneDriveKpiCards'
import { OverLicenceSection } from './OverLicenceSection'

const DRIVE_COLUMNS = ['name', 'owner', 'used', 'capacity', 'files', 'active', 'lastActivity'] as const

export function OneDriveUsage() {
  const t = useTranslation()
  const { settings } = useSettings()
  const { data, error, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportLoading stage="loadingReport" />

  const { oneDrive, offenders, caveats } = data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('reports.oneDriveUsage.title')} help={<HelpButton topic="oneDriveUsage" />}>
        {t('oneDrive.description')} {t('app.dataAsOf', { date: data.reportRefreshDate })}{' '}
        {t('app.reportLagNote')}
      </PageHeader>
      <OneDriveKpiCards overview={data} />
      <NameCaveats caveats={caveats} />
      <Section
        title={t('oneDrive.top.title')}
        subtitle={t('oneDrive.top.subtitle')}
        help={<HelpButton topic="oneDriveDrives" />}
        delay={80}
      >
        <Panel>
          <FacetBars
            items={offenders.topDrives}
            formatValue={formatBytes}
            emptyText={t('oneDrive.top.empty')}
          />
          <PanelDescription>{t('oneDrive.allocationNote')}</PanelDescription>
        </Panel>
      </Section>
      <OverLicenceSection overview={data} delay={120} />
      <Section
        title={t('oneDrive.table.title')}
        subtitle={t('oneDrive.table.subtitle', { retained: oneDrive.deletedButBilling.count })}
        help={<HelpButton topic="oneDriveDrives" />}
        delay={160}
      >
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
