import { useSettings } from '@/app/useSettings'
import { NameCaveats } from '@/components/NameCaveats'
import { UnreadReports } from '@/components/UnreadReports'
import { SiteTable } from '@/components/SiteTable'
import { FacetBars } from '@/design/charts'
import { POOL_COLOR } from '@/design/theme'
import { HelpButton } from '@/app/help/HelpButton'
import { PageHeader, Panel, PanelDescription, PanelLabel, Section } from '@/design/primitives'
import { ReportDate } from '@/app/ReportDate'
import { reportsOfPool } from '@/model/storageOverview'
import { ReportLoading } from '@/app/ReportLoading'
import { AccessFailure } from '@/features/storageOptimization/AccessFailure'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useStorageOverview } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes } from '@/lib/format'
import type { StorageOverview } from '@/types/storage'
import { OneDriveKpiCards } from './OneDriveKpiCards'
import { InactiveDrivesSection } from './InactiveDrivesSection'
import { OverLicenceSection } from './OverLicenceSection'

const DRIVE_COLUMNS = ['name', 'owner', 'used', 'capacity', 'files', 'active', 'lastActivity'] as const

export function OneDriveUsage() {
  const t = useTranslation()
  const { settings } = useSettings()
  const { data, error, notReloaded, isPending } = useStorageOverview(settings)
  const { refresh } = useRefreshReport()

  if (error) return <AccessFailure error={error} onRetry={refresh} />
  if (isPending || !data) return <ReportLoading stage="loadingReport" />

  const { oneDrive } = data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('reports.oneDriveUsage.title')} help={<HelpButton topic="oneDriveUsage" />}>
        {t('oneDrive.description')} <ReportDate date={data.reportRefreshDate} />
      </PageHeader>
      <UnreadReports
        reports={oneDrive.unreadReports}
        notReloaded={notReloaded === null ? null : reportsOfPool(notReloaded, 'OneDrive')}
      />
      {oneDrive.read && <OneDriveKpiCards overview={data} />}
      {oneDrive.accountReportRead && <DriveSections overview={data} />}
    </div>
  )
}

function DriveSections({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { oneDrive, offenders, caveats } = overview

  return (
    <>
      <NameCaveats caveats={caveats} />
      <Section
        title={t('oneDrive.top.title')}
        subtitle={t('oneDrive.top.subtitle')}
        help={<HelpButton topic="oneDriveTopDrives" />}
        delay={80}
      >
        <Panel>
          <FacetBars
            items={offenders.topDrives}
            ariaLabel={t('oneDrive.top.title')}
            color={POOL_COLOR.OneDrive}
            formatValue={formatBytes}
            emptyText={t('oneDrive.top.empty')}
            nameMask={caveats.nameMask}
          />
          <PanelDescription>{t('oneDrive.allocationNote')}</PanelDescription>
        </Panel>
      </Section>
      <OverLicenceSection overview={overview} delay={120} />
      <InactiveDrivesSection overview={overview} delay={140} />
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
            poolUsedBytes={offenders.poolUsedBytes}
            columns={[...DRIVE_COLUMNS]}
            label={t('oneDrive.table.label')}
            nameHeader={t('oneDrive.table.driveHeader')}
            nameHelp={t('table.column.help.drive')}
            nameMask={caveats.nameMask}
          />
        </Panel>
      </Section>
    </>
  )
}
