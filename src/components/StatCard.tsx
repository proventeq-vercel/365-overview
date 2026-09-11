import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import { DeltaIndicator } from './DeltaIndicator'
import type { HealthStatus } from '@/lib/thresholds'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: number | null
  status?: HealthStatus
}

export function StatCard({ label, value, sub, delta, status }: Props) {
  return (
    <Card className="h-full border-hairline shadow-none">
      <CardContent className="flex flex-1 flex-col gap-1 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          {status && <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />}
          {status && <span className="sr-only">{status}</span>}
        </div>
        <span className="text-3xl font-bold tabular text-ink">{value}</span>
        <div className="flex items-center gap-2">
          {delta !== undefined && <DeltaIndicator pct={delta} />}
          {sub && <span className="text-sm text-muted-foreground tabular">{sub}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
