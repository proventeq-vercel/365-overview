import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_GRID, CHART_TICK, P365, facetFill } from '@/design/theme'
import { EmptyBlock } from '@/design/primitives'

const TOOLTIP_STYLE = {
  borderRadius: 6,
  border: `1px solid ${P365.grey100}`,
  fontFamily: 'Open Sans',
  fontSize: 12,
} as const

export interface ColouredSlice {
  name: string
  value: number
  color: string
}

export function MonoDoughnut({
  slices,
  center,
  formatValue,
  height = 200,
  ariaLabel,
}: {
  slices: ColouredSlice[]
  center?: ReactNode
  formatValue: (value: number) => string
  height?: number
  ariaLabel: string
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={slices}
            nameKey="name"
            dataKey="value"
            innerRadius="66%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatValue(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-[45%] flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}

export interface LineSeries {
  key: string
  name: string
  dashed?: boolean
}

export function MonoLineChart({
  data,
  xKey,
  series,
  formatValue,
  formatX,
  referenceLine,
  height = 256,
  ariaLabel,
}: {
  data: Record<string, unknown>[]
  xKey: string
  series: LineSeries[]
  formatValue: (value: number) => string
  formatX: (label: string) => string
  referenceLine?: { value: number; label: string }
  height?: number
  ariaLabel: string
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} />
          <XAxis
            dataKey={xKey}
            tick={CHART_TICK}
            stroke={P365.grey100}
            tickLine={false}
            tickFormatter={formatX}
            angle={-30}
            textAnchor="end"
            height={44}
            interval={0}
          />
          <YAxis
            tick={CHART_TICK}
            stroke={P365.grey100}
            tickLine={false}
            axisLine={false}
            width={68}
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => formatValue(Number(v))}
            labelFormatter={(label) => formatX(String(label))}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: P365.grey700, paddingTop: 8 }}
          />
          {referenceLine && (
            <ReferenceLine
              y={referenceLine.value}
              stroke={P365.grey400}
              strokeDasharray="3 4"
              ifOverflow="extendDomain"
              label={{
                value: referenceLine.label,
                position: 'insideTopRight',
                fill: P365.grey500,
                fontSize: 11,
              }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={P365.blue}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '8 4' : undefined}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonoBarChart({
  data,
  formatValue,
  height = 288,
  ariaLabel,
}: {
  data: { name: string; value: number }[]
  formatValue: (value: number) => string
  height?: number
  ariaLabel: string
}) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={CHART_TICK}
            stroke={P365.grey100}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={CHART_TICK}
            stroke={P365.grey100}
            tickLine={false}
            axisLine={false}
            width={68}
            tickFormatter={formatValue}
          />
          <Tooltip
            cursor={{ fill: CHART_GRID }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => formatValue(Number(v))}
          />
          <Bar dataKey="value" fill={P365.blue} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FacetBars({
  items,
  formatValue,
  emptyText,
}: {
  items: { name: string; value: number }[]
  formatValue: (value: number) => string
  emptyText: string
}) {
  if (items.length === 0) return <EmptyBlock>{emptyText}</EmptyBlock>
  const max = items.reduce((top, item) => Math.max(top, item.value), 1)

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <li key={item.name} className="flex items-center gap-3">
          <div className="relative flex h-7 min-w-0 flex-1 items-center">
            <span
              className="absolute inset-y-0 left-0 rounded-sm"
              style={{ width: `${(item.value / max) * 100}%`, background: facetFill(index) }}
              aria-hidden="true"
            />
            <span className="relative min-w-0 truncate px-2 text-xs font-semibold text-p365-navy">
              {item.name}
            </span>
          </div>
          <span className="tabular shrink-0 text-xs text-p365-grey-700">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  )
}
