import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { STATUS_COLORS } from './chartTheme'
import { utilizationStatus, LICENSE_THRESHOLDS } from '@/lib/thresholds'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

interface Props {
  value: number // 0–100
  label: string
  height?: number
  ariaLabel?: string
}

export function RadialGauge({ value, label, height = 200, ariaLabel }: Props) {
  const reduced = usePrefersReducedMotion()
  const clamped = Math.min(100, Math.max(0, value))
  const status = utilizationStatus(clamped, 100, LICENSE_THRESHOLDS)
  const color = STATUS_COLORS[status]
  return (
    <div role="img" aria-label={ariaLabel ?? `${label}: ${Math.round(clamped)} percent`} className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          data={[{ value: clamped, fill: color }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="70%"
          outerRadius="100%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={999} isAnimationActive={!reduced} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-ink tabular">{Math.round(clamped)}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
