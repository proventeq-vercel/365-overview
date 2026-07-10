import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import { Sparkline } from '@/components/charts/Sparkline'
import type { HealthStatus } from '@/lib/thresholds'

interface Props {
  to: string
  label: string
  value: string
  status: HealthStatus
  series?: Record<string, unknown>[]
  seriesKey?: string
}

export function HealthTile({ to, label, value, status, series, seriesKey }: Props) {
  return (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
      <Card className="border-hairline shadow-none transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">{label}</span>
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
            <span className="sr-only">{status}</span>
          </div>
          <span className="text-2xl font-bold tabular text-ink">{value}</span>
          {series && seriesKey && series.length > 1 && (
            <Sparkline data={series} dataKey={seriesKey} ariaLabel={`${label} trend`} />
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
