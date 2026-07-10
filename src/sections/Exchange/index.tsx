import { useState } from 'react'
import { useMailbox, useEmailActivity } from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { TrendChart } from '../../components/TrendChart'
import { PeriodSelector } from '../../components/PeriodSelector'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import { formatBytes, formatNumber } from '../../lib/format'
import type { ReportPeriod } from '../../types/reports'

export function Exchange() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const mailbox = useMailbox(period)
  const emailActivity = useEmailActivity(period)

  const error = mailbox.error ?? emailActivity.error
  const mailboxData = mailbox.data
  const emailActivityData = emailActivity.data

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Exchange</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : !mailboxData || !emailActivityData ? (
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="card-grid">
            <KpiCard
              label="Total mailboxes"
              value={formatNumber(mailboxData.totalMailboxes)}
            />
            <KpiCard
              label="Active mailboxes"
              value={formatNumber(mailboxData.activeMailboxes)}
            />
            <KpiCard
              label="Mailbox storage used"
              value={formatBytes(mailboxData.storageUsedBytes)}
            />
          </div>

          <h2 className="section-heading">Email activity</h2>
          <TrendChart
            data={emailActivityData.map((p) => ({ ...p }))}
            xKey="date"
            series={[
              { key: 'send', name: 'Sent' },
              { key: 'receive', name: 'Received' },
              { key: 'read', name: 'Read' },
            ]}
          />
        </>
      )}
    </section>
  )
}
