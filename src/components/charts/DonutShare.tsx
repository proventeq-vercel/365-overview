import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, GRID_STROKE } from './chartTheme'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

interface Props {
  data: Record<string, unknown>[]
  nameKey: string
  valueKey: string
  height?: number
  ariaLabel?: string
}

export function DonutShare({ data, nameKey, valueKey, height = 240, ariaLabel }: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data} nameKey={nameKey} dataKey={valueKey} innerRadius="55%" outerRadius="80%" paddingAngle={2}
            isAnimationActive={!reduced}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
