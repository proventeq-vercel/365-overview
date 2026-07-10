import { useState } from 'react'
import { useOrg, useActiveUsers, useOneDrive, useTeams } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import { percentDelta } from '@/lib/trend'
import type { ReportPeriod } from '@/types/reports'
import type { UsagePoint } from '@/types/reports'

function last(points: UsagePoint[]): number {
  return points.length ? points[points.length - 1].value : 0
}

export function Estate() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const org = useOrg()
  const activeUsers = useActiveUsers(period)
  const oneDrive = useOneDrive(period)
  const teams = useTeams(period)

  const error = org.error ?? activeUsers.error ?? oneDrive.error ?? teams.error
  const ready = org.data && activeUsers.data && oneDrive.data && teams.data

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Estate">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {error ? (
        <ErrorState error={error} />
      ) : !ready ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <Card className="border-hairline shadow-none">
            <CardContent className="flex flex-wrap gap-x-10 gap-y-2 p-5 text-sm">
              <div><span className="text-muted-foreground">Organization</span><div className="font-semibold text-ink">{org.data!.displayName}</div></div>
              <div><span className="text-muted-foreground">Verified domain</span><div className="font-semibold text-ink">{org.data!.verifiedDomain}</div></div>
              <div><span className="text-muted-foreground">Country</span><div className="font-semibold text-ink">{org.data!.country ?? '—'}</div></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Active users" value={formatNumber(last(activeUsers.data!))}
              delta={percentDelta(activeUsers.data!.map((p) => p.value))} />
            <StatCard label="OneDrive usage" value={formatBytes(last(oneDrive.data!))}
              delta={percentDelta(oneDrive.data!.map((p) => p.value))} />
            <StatCard label="Teams activity" value={formatNumber(last(teams.data!))}
              delta={percentDelta(teams.data!.map((p) => p.value))} />
          </div>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Active users</h2>
              <AreaTrend data={activeUsers.data!.map((p) => ({ ...p }))} xKey="date" series={[{ key: 'value', name: 'Active users' }]} ariaLabel="Active users over time" />
            </CardContent>
          </Card>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">OneDrive usage</h2>
              <AreaTrend data={oneDrive.data!.map((p) => ({ ...p }))} xKey="date" series={[{ key: 'value', name: 'Storage used (bytes)' }]} ariaLabel="OneDrive storage over time" valueFormatter={formatBytes} />
            </CardContent>
          </Card>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Teams activity</h2>
              <AreaTrend data={teams.data!.map((p) => ({ ...p }))} xKey="date" series={[{ key: 'value', name: 'Teams activity' }]} ariaLabel="Teams activity over time" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
