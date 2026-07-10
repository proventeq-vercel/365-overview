import { useState } from 'react'
import { useAzureSubscriptions, useAzureResourceCounts, useAzureCost } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/format'

const COLUMNS = [
  { key: 'type', header: 'Resource type' },
  { key: 'count', header: 'Count' },
]

function shortType(t: string) {
  return t.split('/').pop() || t
}

export function Azure() {
  const subscriptions = useAzureSubscriptions()
  const [selectedSubId, setSelectedSubId] = useState('')
  const subId = selectedSubId || subscriptions.data?.[0]?.subscriptionId || ''
  const resourceCounts = useAzureResourceCounts(subId)
  const cost = useAzureCost(subId)

  if (subscriptions.isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Azure" />
        <ErrorState error={subscriptions.error} />
      </div>
    )
  }
  if (subscriptions.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Azure" />
        <div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    )
  }

  const activeSub = subscriptions.data.find((s) => s.subscriptionId === subId)
  const totalResources = resourceCounts.data?.reduce((a, r) => a + r.count, 0) ?? 0
  const costLabel = cost.isPending ? '—' : cost.isError ? 'Unavailable'
    : `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}`

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Azure">
        <Select
          value={subId}
          onValueChange={(value) => setSelectedSubId(value ?? '')}
        >
          <SelectTrigger className="w-56"><SelectValue placeholder="Subscription" /></SelectTrigger>
          <SelectContent>
            {subscriptions.data.map((sub) => (
              <SelectItem key={sub.subscriptionId} value={sub.subscriptionId}>{sub.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Azure spend (MTD)" value={costLabel} />
        <StatCard label="Total resources" value={formatNumber(totalResources)} />
        <Card className="border-hairline shadow-none">
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscription state</span>
            <div>{activeSub && <StatusBadge status={activeSub.state === 'Enabled' ? 'healthy' : 'attention'} label={activeSub.state} />}</div>
          </CardContent>
        </Card>
      </div>

      {resourceCounts.isError ? (
        <ErrorState error={resourceCounts.error} />
      ) : resourceCounts.isPending ? (
        <div className="grid grid-cols-2 gap-4"><SkeletonCard /></div>
      ) : (
        <>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Resource mix</h2>
              <BarBreakdown
                data={[...resourceCounts.data].sort((a, b) => b.count - a.count).map((r) => ({ type: shortType(r.type), count: r.count }))}
                categoryKey="type" valueKeys={[{ key: 'count', name: 'Count' }]}
                ariaLabel="Azure resource counts by type" height={320} />
            </CardContent>
          </Card>
          <DataTable columns={COLUMNS} rows={resourceCounts.data.map((r) => ({ type: r.type, count: formatNumber(r.count) }))} />
        </>
      )}
    </div>
  )
}
