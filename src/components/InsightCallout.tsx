import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import type { HealthStatus } from '@/lib/thresholds'

export function InsightCallout({ status, message }: { status: HealthStatus; message: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-hairline bg-surface px-4 py-3')}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
      <span className="text-sm text-ink"><span className="sr-only">{status}: </span>{message}</span>
    </div>
  )
}
