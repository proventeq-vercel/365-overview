import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HealthStatus } from '@/lib/thresholds'

const MAP: Record<HealthStatus, { label: string; Icon: typeof CheckCircle2; className: string }> = {
  healthy: { label: 'Healthy', Icon: CheckCircle2, className: 'bg-brand/12 text-brand-strong border-brand/30' },
  watch: { label: 'Watch', Icon: AlertTriangle, className: 'bg-amber/15 text-[#8a6d00] border-amber/40' },
  attention: { label: 'Attention', Icon: AlertCircle, className: 'bg-coral/15 text-[#b4531d] border-coral/40' },
}

export function StatusBadge({ status, label }: { status: HealthStatus; label?: string }) {
  const { label: def, Icon, className } = MAP[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-semibold', className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? def}
    </Badge>
  )
}
