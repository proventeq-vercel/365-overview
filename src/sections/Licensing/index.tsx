import type { ReactNode } from 'react'
import { useLicenses } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { UtilizationMeter } from '@/components/UtilizationMeter'
import { DataTable } from '@/components/DataTable'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber, formatPercent } from '@/lib/format'
import { LICENSE_THRESHOLDS, utilizationStatus } from '@/lib/thresholds'

interface SkuRow extends Record<string, unknown> {
  skuPartNumber: string
  consumed: string
  enabled: string
  available: string
  pct: string
  status: string
  render_status: ReactNode
}

const COLUMNS = [
  { key: 'skuPartNumber', header: 'SKU' },
  { key: 'consumed', header: 'Consumed' },
  { key: 'enabled', header: 'Enabled' },
  { key: 'available', header: 'Available' },
  { key: 'pct', header: '% consumed' },
  { key: 'status', header: 'Status', render: (r: SkuRow) => r.render_status },
]

export function Licensing() {
  const { data, isError, error } = useLicenses()

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Licensing" />

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (() => {
        const consumed = data.reduce((a, s) => a + s.consumed, 0)
        const enabled = data.reduce((a, s) => a + s.enabled, 0)
        const available = data.reduce((a, s) => a + s.available, 0)
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatCard label="Seats consumed" value={formatNumber(consumed)}
                sub={`${formatPercent(enabled ? consumed / enabled : 0)} of enabled`} />
              <StatCard label="Seats enabled" value={formatNumber(enabled)} />
              <StatCard label="Seats available" value={formatNumber(available)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-hairline shadow-none lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Seats by SKU</h2>
                  <BarBreakdown
                    data={data.map((s) => ({ sku: s.skuPartNumber, Consumed: s.consumed, Available: s.available }))}
                    categoryKey="sku"
                    valueKeys={[{ key: 'Consumed', name: 'Consumed' }, { key: 'Available', name: 'Available' }]}
                    stack
                    ariaLabel="Consumed versus available seats per SKU"
                  />
                </CardContent>
              </Card>
              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <h2 className="mb-1 text-sm font-semibold text-ink-soft">Total utilization</h2>
                  <RadialGauge value={enabled ? (consumed / enabled) * 100 : 0}
                    label={`${formatNumber(consumed)} / ${formatNumber(enabled)}`}
                    ariaLabel="Total seat utilization" />
                </CardContent>
              </Card>
            </div>

            <DataTable
              columns={COLUMNS}
              rows={data.map((s): SkuRow => {
                const st = utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS)
                return {
                  skuPartNumber: s.skuPartNumber,
                  consumed: formatNumber(s.consumed),
                  enabled: formatNumber(s.enabled),
                  available: formatNumber(s.available),
                  pct: formatPercent(s.enabled ? s.consumed / s.enabled : 0),
                  status: '',
                  render_status: <StatusBadge status={st} />,
                }
              })}
            />

            <Card className="border-hairline shadow-none">
              <CardContent className="flex flex-col gap-4 p-5">
                <h2 className="text-sm font-semibold text-ink-soft">Per-SKU capacity</h2>
                {data.map((s) => (
                  <UtilizationMeter key={s.skuId} label={s.skuPartNumber}
                    used={s.consumed} total={s.enabled} thresholds={LICENSE_THRESHOLDS} />
                ))}
              </CardContent>
            </Card>
          </>
        )
      })()}
    </div>
  )
}
