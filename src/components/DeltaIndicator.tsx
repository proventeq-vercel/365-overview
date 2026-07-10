import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSignedPercent } from '@/lib/format'

export function DeltaIndicator({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" /> n/a
      </span>
    )
  }
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-brand-strong' : 'text-[#b4531d]')}
      aria-label={`change ${formatSignedPercent(pct)}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatSignedPercent(pct)}
    </span>
  )
}
