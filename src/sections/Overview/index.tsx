import {
  useSharePoint, useLicenses, useAzureSubscriptions, useAzureCost,
  useActiveUsers, useTeams, useMailbox,
} from '@/hooks/useReports'
import { HealthTile } from '@/components/HealthTile'
import { InsightCallout } from '@/components/InsightCallout'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { SectionHeader } from '@/components/SectionHeader'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import {
  utilizationStatus, STORAGE_THRESHOLDS, LICENSE_THRESHOLDS, type HealthStatus,
} from '@/lib/thresholds'

const PERIOD = 'D30'
const RANK: Record<HealthStatus, number> = { healthy: 0, watch: 1, attention: 2 }

export function Overview() {
  const sharePoint = useSharePoint(PERIOD)
  const licenses = useLicenses()
  const subscriptions = useAzureSubscriptions()
  const subId = subscriptions.data?.[0]?.subscriptionId ?? ''
  const cost = useAzureCost(subId)
  const activeUsers = useActiveUsers(PERIOD)
  const teams = useTeams(PERIOD)
  const mailbox = useMailbox(PERIOD)

  const error = sharePoint.error ?? licenses.error
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Overview" />
        <ErrorState error={error} />
      </div>
    )
  }

  const sp = sharePoint.data
  const lic = licenses.data
  if (!sp || !lic) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const consumedSeats = lic.reduce((a, s) => a + s.consumed, 0)
  const enabledSeats = lic.reduce((a, s) => a + s.enabled, 0)
  const licenseStatus = lic
    .map((s) => utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS))
    .reduce<HealthStatus>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'healthy')
  const spStatus = utilizationStatus(sp.storageUsedBytes, sp.storageAllocatedBytes, STORAGE_THRESHOLDS)

  // Needs-attention list computed across services.
  const alerts: { status: HealthStatus; message: string }[] = []
  for (const s of lic) {
    const st = utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS)
    if (st !== 'healthy') {
      const pct = Math.round((s.consumed / s.enabled) * 100)
      alerts.push({ status: st, message: `${s.skuPartNumber} at ${pct}% seat capacity (${s.available} available)` })
    }
  }
  for (const site of sp.sites) {
    const st = utilizationStatus(site.storageUsedBytes, site.storageAllocatedBytes, STORAGE_THRESHOLDS)
    if (st !== 'healthy') {
      const pct = Math.round((site.storageUsedBytes / site.storageAllocatedBytes) * 100)
      const name = site.siteUrl.replace(/\/$/, '').split('/').pop() || site.siteUrl
      alerts.push({ status: st, message: `${name} site at ${pct}% storage capacity` })
    }
  }
  alerts.sort((a, b) => RANK[b.status] - RANK[a.status])

  const spend = cost.data ? `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}` : '—'
  const activeUsersSeries = activeUsers.data ?? []
  const teamsSeries = teams.data ?? []

  const storageByService = [
    { service: 'SharePoint', bytes: sp.storageUsedBytes },
    { service: 'Mailbox', bytes: mailbox.data?.storageUsedBytes ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Overview" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <HealthTile to="/sharepoint" label="SharePoint" value={`${formatNumber(sp.totalSites)} sites`} status={spStatus} />
        <HealthTile to="/licensing" label="Licensing" value={`${formatNumber(consumedSeats)} seats`} status={licenseStatus} />
        <HealthTile to="/exchange" label="Exchange"
          value={mailbox.data ? formatNumber(mailbox.data.totalMailboxes) : '—'} status="healthy" />
        <HealthTile to="/estate" label="Active users"
          value={activeUsersSeries.length ? formatNumber(activeUsersSeries[activeUsersSeries.length - 1].value) : '—'}
          status="healthy" series={activeUsersSeries as unknown as Record<string, unknown>[]} seriesKey="value" />
        <HealthTile to="/azure" label="Azure spend (MTD)" value={spend} status="healthy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-hairline shadow-none lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">Needs attention</h2>
            <div className="flex flex-col gap-2">
              {alerts.length === 0
                ? <InsightCallout status="healthy" message="All services within healthy thresholds." />
                : alerts.map((a, i) => <InsightCallout key={i} status={a.status} message={a.message} />)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-hairline shadow-none">
          <CardContent className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink-soft">License utilization</h2>
            <RadialGauge value={enabledSeats ? (consumedSeats / enabledSeats) * 100 : 0}
              label={`${formatNumber(consumedSeats)} / ${formatNumber(enabledSeats)}`}
              ariaLabel="Overall license seat utilization" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-hairline shadow-none">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">Storage used by service</h2>
          <BarBreakdown data={storageByService} categoryKey="service"
            valueKeys={[{ key: 'bytes', name: 'Storage used' }]}
            ariaLabel="Storage used by service" height={160} />
          <p className="mt-2 text-xs text-muted-foreground">
            SharePoint {formatBytes(sp.storageUsedBytes)}
            {mailbox.data ? ` · Mailbox ${formatBytes(mailbox.data.storageUsedBytes)}` : ''}
            {teamsSeries.length ? '' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
