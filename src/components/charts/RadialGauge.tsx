import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { STATUS_COLORS } from './chartTheme'
import type { HealthStatus } from '@/lib/thresholds'

interface Props {
  value: number
  status: HealthStatus
  label: string
  height?: number
  ariaLabel?: string
}

export function RadialGauge({ value, status, label, height = 200, ariaLabel }: Props) {
  const percent = Math.round(value)
  const drawn = Math.min(100, Math.max(0, value))
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `${label}: ${percent} percent`}
      data-status={status}
      className="relative w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          data={[{ value: drawn, fill: STATUS_COLORS[status] }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="70%"
          outerRadius="100%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={999} isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-ink tabular">{percent}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
