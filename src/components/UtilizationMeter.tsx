import { cn } from '@/lib/utils'
import { utilizationStatus, type Thresholds } from '@/lib/thresholds'
import { STATUS_COLORS } from '@/components/charts/chartTheme'

interface Props {
  used: number
  total: number
  thresholds: Thresholds
  label: string
}

export function UtilizationMeter({ used, total, thresholds, label }: Props) {
  const pct = total <= 0 ? 0 : Math.round((used / total) * 100)
  const clamped = Math.min(100, Math.max(0, pct))
  const status = utilizationStatus(used, total, thresholds)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular text-ink">{pct}%</span>
      </div>
      <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted')}>
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, background: STATUS_COLORS[status] }}
        />
      </div>
    </div>
  )
}
