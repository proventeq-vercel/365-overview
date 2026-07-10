import { useState } from 'react'
import { useMailbox, useEmailActivity } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { DonutShare } from '@/components/charts/DonutShare'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import type { ReportPeriod } from '@/types/reports'

export function Exchange() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const mailbox = useMailbox(period)
  const emailActivity = useEmailActivity(period)

  const error = mailbox.error ?? emailActivity.error
  const mb = mailbox.data
  const ea = emailActivity.data

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Exchange">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {error ? (
        <ErrorState error={error} />
      ) : !mb || !ea ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (() => {
        const inactive = Math.max(0, mb.totalMailboxes - mb.activeMailboxes)
        const avg = mb.totalMailboxes ? mb.storageUsedBytes / mb.totalMailboxes : 0
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total mailboxes" value={formatNumber(mb.totalMailboxes)} />
              <StatCard label="Active mailboxes" value={formatNumber(mb.activeMailboxes)}
                sub={`${formatNumber(inactive)} inactive`} />
              <StatCard label="Mailbox storage used" value={formatBytes(mb.storageUsedBytes)} />
              <StatCard label="Avg mailbox size" value={formatBytes(avg)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-hairline shadow-none lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Email activity</h2>
                  <AreaTrend data={ea.map((p) => ({ ...p }))} xKey="date" stack
                    series={[{ key: 'send', name: 'Sent' }, { key: 'receive', name: 'Received' }, { key: 'read', name: 'Read' }]}
                    ariaLabel="Email sent, received and read over time" />
                </CardContent>
              </Card>
              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Mailbox activity</h2>
                  <DonutShare
                    data={[{ name: 'Active', value: mb.activeMailboxes }, { name: 'Inactive', value: inactive }]}
                    nameKey="name" valueKey="value"
                    ariaLabel="Active versus inactive mailboxes" />
                </CardContent>
              </Card>
            </div>
          </>
        )
      })()}
    </div>
  )
}
