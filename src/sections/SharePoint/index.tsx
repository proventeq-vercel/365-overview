import { useState } from 'react'
import { useSharePoint } from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { DataTable } from '../../components/DataTable'
import { ConsumptionBar } from '../../components/ConsumptionBar'
import { PeriodSelector } from '../../components/PeriodSelector'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import { formatBytes, formatNumber } from '../../lib/format'
import type { ReportPeriod } from '../../types/reports'

const SITE_COLUMNS = [
  { key: 'siteUrl', header: 'Site URL' },
  { key: 'owner', header: 'Owner' },
  { key: 'files', header: 'Files' },
  { key: 'storage', header: 'Storage used' },
]

export function SharePoint() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const { data, isError, error } = useSharePoint(period)

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">SharePoint</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="card-grid">
            <KpiCard label="Total sites" value={formatNumber(data.totalSites)} />
            <KpiCard label="Total files" value={formatNumber(data.totalFiles)} />
            <KpiCard
              label="Active files"
              value={formatNumber(data.activeFiles)}
            />
            <KpiCard
              label="Storage used"
              value={formatBytes(data.storageUsedBytes)}
            />
          </div>

          <ConsumptionBar
            used={data.storageUsedBytes}
            total={data.storageAllocatedBytes}
            label={`Storage used: ${formatBytes(data.storageUsedBytes)} of ${formatBytes(data.storageAllocatedBytes)}`}
          />

          <DataTable
            columns={SITE_COLUMNS}
            rows={data.sites.map((s) => ({
              siteUrl: s.siteUrl,
              owner: s.ownerDisplayName,
              files: formatNumber(s.fileCount),
              storage: formatBytes(s.storageUsedBytes),
            }))}
          />
        </>
      )}
    </section>
  )
}
