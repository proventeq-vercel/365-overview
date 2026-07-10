import { cn } from '@/lib/utils'
import type { ReportPeriod } from '@/types/reports'

const PERIODS: ReportPeriod[] = ['D7', 'D30', 'D90', 'D180']
const LABELS: Record<ReportPeriod, string> = { D7: '7 days', D30: '30 days', D90: '90 days', D180: '180 days' }

interface Props { value: ReportPeriod; onChange: (p: ReportPeriod) => void }

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Report period" className="inline-flex gap-1 rounded-full border border-hairline bg-surface p-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink',
            value === p && 'bg-brand/12 text-brand-strong',
          )}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  )
}
