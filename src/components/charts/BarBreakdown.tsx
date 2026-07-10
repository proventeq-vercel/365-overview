import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_INK, GRID_STROKE, TICK } from './chartTheme'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

interface ValueKey { key: string; name: string }
interface Props {
  data: Record<string, unknown>[]
  categoryKey: string
  valueKeys: ValueKey[]
  horizontal?: boolean
  stack?: boolean
  height?: number
  ariaLabel?: string
  valueFormatter?: (v: number) => string
}

export function BarBreakdown({
  data, categoryKey, valueKeys, horizontal = true, stack, height = 280, ariaLabel, valueFormatter,
}: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={TICK} stroke={AXIS_INK} tickLine={false} tickFormatter={valueFormatter} />
              <YAxis type="category" dataKey={categoryKey} tick={TICK} stroke={AXIS_INK} tickLine={false} width={140} />
            </>
          ) : (
            <>
              <XAxis type="category" dataKey={categoryKey} tick={TICK} stroke={AXIS_INK} tickLine={false} />
              <YAxis type="number" tick={TICK} stroke={AXIS_INK} tickLine={false} width={48} tickFormatter={valueFormatter} />
            </>
          )}
          <Tooltip
            contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }}
            formatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
          />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((v, i) => (
            <Bar
              key={v.key}
              dataKey={v.key}
              name={v.name}
              stackId={stack ? 'a' : undefined}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              isAnimationActive={!reduced}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
