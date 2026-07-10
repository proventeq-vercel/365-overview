import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_INK, GRID_STROKE, TICK } from './chartTheme'

interface Series { key: string; name: string }
interface Props {
  data: Record<string, unknown>[]
  xKey: string
  series: Series[]
  stack?: boolean
  height?: number
  ariaLabel?: string
}

export function AreaTrend({ data, xKey, series, stack, height = 240, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            {series.map((s, i) => {
              const c = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey={xKey} tick={TICK} stroke={AXIS_INK} tickLine={false} />
          <YAxis tick={TICK} stroke={AXIS_INK} tickLine={false} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }} />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => {
            const c = CHART_COLORS[i % CHART_COLORS.length]
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stackId={stack ? 'a' : undefined}
                stroke={c}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
