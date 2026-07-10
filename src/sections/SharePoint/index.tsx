import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSharePoint } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { UtilizationMeter } from '@/components/UtilizationMeter'
import { DataTable } from '@/components/DataTable'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DonutShare } from '@/components/charts/DonutShare'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'
import { STORAGE_THRESHOLDS } from '@/lib/thresholds'
import type { ReportPeriod } from '@/types/reports'

function siteName(url: string) {
  return url.replace(/\/$/, '').split('/').pop() || url
}

interface SiteRow extends Record<string, unknown> {
  siteUrl: string
  owner: string
  files: string
  activeFiles: string
  allocated: string
  utilization: string
  _used: number
  _alloc: number
}

const COLUMNS: Array<{ key: string; header: string; render?: (row: SiteRow) => ReactNode }> = [
  { key: 'siteUrl', header: 'Site URL' },
  { key: 'owner', header: 'Owner' },
  { key: 'files', header: 'Files' },
  { key: 'activeFiles', header: 'Active files' },
  { key: 'allocated', header: 'Allocated' },
  {
    key: 'utilization',
    header: 'Utilization',
    render: (r) => (
      <div className="w-40">
        <UtilizationMeter
          label={siteName(r.siteUrl)}
          used={r._used}
          total={r._alloc}
          thresholds={STORAGE_THRESHOLDS}
        />
      </div>
    ),
  },
]

export function SharePoint() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const { data, isError, error } = useSharePoint(period)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="SharePoint">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total sites" value={formatNumber(data.totalSites)} />
            <StatCard label="Total files" value={formatNumber(data.totalFiles)} />
            <StatCard label="Active files" value={formatNumber(data.activeFiles)}
              sub={`${formatPercent(data.totalFiles ? data.activeFiles / data.totalFiles : 0)} active`} />
            <StatCard label="Storage used" value={formatBytes(data.storageUsedBytes)}
              sub={`of ${formatBytes(data.storageAllocatedBytes)}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-hairline shadow-none lg:col-span-2">
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink-soft">Top sites — used vs allocated</h2>
                <BarBreakdown
                  data={[...data.sites]
                    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
                    .slice(0, 8)
                    .map((s) => ({
                      site: siteName(s.siteUrl),
                      Used: Math.round(s.storageUsedBytes / 1_073_741_824),
                      Free: Math.max(0, Math.round((s.storageAllocatedBytes - s.storageUsedBytes) / 1_073_741_824)),
                    }))}
                  categoryKey="site"
                  valueKeys={[{ key: 'Used', name: 'Used (GB)' }, { key: 'Free', name: 'Free (GB)' }]}
                  stack
                  ariaLabel="Top sites by storage, used versus free in gigabytes"
                />
              </CardContent>
            </Card>
            <Card className="border-hairline shadow-none">
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink-soft">Storage distribution</h2>
                <DonutShare
                  data={data.sites.map((s) => ({ site: siteName(s.siteUrl), gb: Math.round(s.storageUsedBytes / 1_073_741_824) }))}
                  nameKey="site" valueKey="gb"
                  ariaLabel="Share of storage used across sites"
                />
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={COLUMNS}
            rows={data.sites.map((s): SiteRow => ({
              siteUrl: s.siteUrl,
              owner: s.ownerDisplayName,
              files: formatNumber(s.fileCount),
              activeFiles: formatNumber(s.activeFileCount),
              allocated: formatBytes(s.storageAllocatedBytes),
              utilization: '',
              _used: s.storageUsedBytes,
              _alloc: s.storageAllocatedBytes,
            }))}
          />

          <Card className="border-hairline shadow-none">
            <CardContent className="flex flex-col gap-4 p-5">
              <h2 className="text-sm font-semibold text-ink-soft">Per-site capacity</h2>
              {data.sites.map((s) => (
                <UtilizationMeter key={s.siteId} label={siteName(s.siteUrl)}
                  used={s.storageUsedBytes} total={s.storageAllocatedBytes} thresholds={STORAGE_THRESHOLDS} />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
