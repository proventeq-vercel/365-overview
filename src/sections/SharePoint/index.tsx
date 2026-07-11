import { useState } from 'react'
import { useSharePoint } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { SiteTable } from '@/components/SiteTable'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DonutShare } from '@/components/charts/DonutShare'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'
import type { ReportPeriod } from '@/types/reports'

const GB = 1_073_741_824

function siteName(url: string) {
  return url.replace(/\/$/, '').split('/').pop() || url
}

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
        (() => {
          const sortedByUsed = [...data.sites].sort(
            (a, b) => b.storageUsedBytes - a.storageUsedBytes,
          )
          const topBar = sortedByUsed.slice(0, 10).map((s) => ({
            site: siteName(s.siteUrl),
            Used: Math.round(s.storageUsedBytes / GB),
          }))
          const top8 = sortedByUsed.slice(0, 8)
          const donutData = top8.map((s) => ({
            site: siteName(s.siteUrl),
            gb: Math.round(s.storageUsedBytes / GB),
          }))
          if (sortedByUsed.length > 8) {
            const otherBytes = sortedByUsed
              .slice(8)
              .reduce((a, s) => a + s.storageUsedBytes, 0)
            donutData.push({ site: 'Other', gb: Math.round(otherBytes / GB) })
          }
          return (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total sites" value={formatNumber(data.totalSites)} />
                <StatCard label="Total files" value={formatNumber(data.totalFiles)} />
                <StatCard label="Active files" value={formatNumber(data.activeFiles)}
                  sub={`${formatPercent(data.totalFiles ? data.activeFiles / data.totalFiles : 0)} active`} />
                <StatCard label="Storage used" value={formatBytes(data.storageUsedBytes)}
                  sub={`across ${formatNumber(data.totalSites)} sites`} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-hairline shadow-none lg:col-span-2">
                  <CardContent className="p-5">
                    <h2 className="mb-3 text-sm font-semibold text-ink-soft">Top consumers by storage</h2>
                    <BarBreakdown
                      data={topBar}
                      categoryKey="site"
                      valueKeys={[{ key: 'Used', name: 'Used (GB)' }]}
                      ariaLabel="Top ten sites by storage used, in gigabytes"
                    />
                  </CardContent>
                </Card>
                <Card className="border-hairline shadow-none">
                  <CardContent className="p-5">
                    <h2 className="mb-3 text-sm font-semibold text-ink-soft">Storage distribution</h2>
                    <DonutShare
                      data={donutData}
                      nameKey="site" valueKey="gb"
                      ariaLabel="Share of storage used across the top sites plus other"
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <SiteTable sites={data.sites} totalUsedBytes={data.storageUsedBytes} />
                </CardContent>
              </Card>
            </>
          )
        })()
      )}
    </div>
  )
}
