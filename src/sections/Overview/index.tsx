import { Link } from 'react-router-dom'
import {
  useSharePoint,
  useLicenses,
  useAzureSubscriptions,
  useAzureCost,
} from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import { formatBytes, formatNumber } from '../../lib/format'

// Usage-derived figures default to a 30-day window.
const PERIOD = 'D30'

export function Overview() {
  const sharePoint = useSharePoint(PERIOD)
  const licenses = useLicenses()
  const subscriptions = useAzureSubscriptions()
  const subId = subscriptions.data?.[0]?.subscriptionId ?? ''
  const cost = useAzureCost(subId)

  // Surface the first error from core M365 queries only — Azure cost/subscription
  // failures are non-fatal and fall back to '—' in the KPI card.
  const error = sharePoint.error ?? licenses.error
  if (error) {
    return (
      <section className="page">
        <h1 className="page__title">Overview</h1>
        <ErrorState error={error} />
      </section>
    )
  }

  // Skeletons until the core M365 data resolves.
  const sp = sharePoint.data
  const licenseData = licenses.data
  if (!sp || !licenseData) {
    return (
      <section className="page">
        <h1 className="page__title">Overview</h1>
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    )
  }

  const consumedSeats = licenseData.reduce((a, s) => a + s.consumed, 0)
  const availableSeats = licenseData.reduce((a, s) => a + s.available, 0)
  const spend = cost.data
    ? `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}`
    : '—'

  return (
    <section className="page">
      <h1 className="page__title">Overview</h1>
      <div className="card-grid">
        <Link to="/sharepoint" className="card-link">
          <KpiCard label="SharePoint sites" value={formatNumber(sp.totalSites)} />
        </Link>
        <Link to="/sharepoint" className="card-link">
          <KpiCard label="Total files" value={formatNumber(sp.totalFiles)} />
        </Link>
        <Link to="/sharepoint" className="card-link">
          <KpiCard
            label="Storage used"
            value={formatBytes(sp.storageUsedBytes)}
          />
        </Link>
        <Link to="/licensing" className="card-link">
          <KpiCard
            label="Licensed seats"
            value={formatNumber(consumedSeats)}
            sub={`${formatNumber(availableSeats)} available`}
          />
        </Link>
        <Link to="/azure" className="card-link">
          <KpiCard label="Azure spend (MTD)" value={spend} />
        </Link>
      </div>
    </section>
  )
}
