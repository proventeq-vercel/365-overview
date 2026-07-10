import { useState } from 'react'
import {
  useAzureSubscriptions,
  useAzureResourceCounts,
  useAzureCost,
} from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { DataTable } from '../../components/DataTable'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import { formatNumber } from '../../lib/format'

const RESOURCE_COLUMNS = [
  { key: 'type', header: 'Resource type' },
  { key: 'count', header: 'Count' },
]

export function Azure() {
  const subscriptions = useAzureSubscriptions()
  const [selectedSubId, setSelectedSubId] = useState('')

  // Default to the first subscription until the user picks one.
  const subId = selectedSubId || subscriptions.data?.[0]?.subscriptionId || ''
  const resourceCounts = useAzureResourceCounts(subId)
  const cost = useAzureCost(subId)

  if (subscriptions.isError) {
    return (
      <section className="page">
        <h1 className="page__title">Azure</h1>
        <ErrorState error={subscriptions.error} />
      </section>
    )
  }

  if (subscriptions.isPending) {
    return (
      <section className="page">
        <h1 className="page__title">Azure</h1>
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Azure</h1>
        <label className="azure-sub-select">
          <span>Subscription</span>
          <select
            value={subId}
            onChange={(e) => setSelectedSubId(e.target.value)}
          >
            {subscriptions.data.map((sub) => (
              <option key={sub.subscriptionId} value={sub.subscriptionId}>
                {sub.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grid">
        <KpiCard
          label="Azure spend (MTD)"
          value={
            cost.isPending
              ? '—'
              : cost.isError
                ? 'Unavailable'
                : `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}`
          }
        />
      </div>

      {resourceCounts.isError ? (
        <ErrorState error={resourceCounts.error} />
      ) : resourceCounts.isPending ? (
        <div className="card-grid">
          <SkeletonCard />
        </div>
      ) : (
        <DataTable
          columns={RESOURCE_COLUMNS}
          rows={resourceCounts.data.map((r) => ({
            type: r.type,
            count: formatNumber(r.count),
          }))}
        />
      )}
    </section>
  )
}
