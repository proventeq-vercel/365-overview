import type { ReactNode } from 'react'
import {
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
import { CHART_GRID, CHART_TICK, P365, POOL_COLOR, facetFill, poolFill } from '@/design/theme'
import { EmptyBlock } from '@/design/primitives'
import { HiddenName } from '@/design/HiddenName'
import { PoolIcon } from '@/design/PoolIcon'
import type { NameMask, StoragePool } from '@/types/storage'

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
            {slices.map((slice, index) => (
              <Cell key={`${index}-${slice.name}`} fill={slice.color} />
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
  dotted?: boolean
}

const LINE_DASH = { dashed: '8 4', dotted: '1 4' } as const

const SINGLE_POINT_DOT = { r: 3, strokeWidth: 0, fill: P365.blue }

export function lineDot(data: Record<string, unknown>[], key: string) {
  const points = data.filter((row) => row[key] !== null && row[key] !== undefined).length
  return points === 1 ? SINGLE_POINT_DOT : false
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
              strokeDasharray={s.dashed ? LINE_DASH.dashed : s.dotted ? LINE_DASH.dotted : undefined}
              strokeLinecap={s.dotted ? 'round' : undefined}
              dot={lineDot(data, s.key)}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface FacetItem {
  name: string
  value: number
  pool?: StoragePool
}

function facetStyle(item: FacetItem, index: number, color: string, max: number) {
  const width = `${(item.value / max) * 100}%`
  if (!item.pool) return { width, background: facetFill(index, color) }
  return { width, background: poolFill(item.pool), borderLeft: `3px solid ${POOL_COLOR[item.pool]}` }
}

export function FacetBars({
  items,
  formatValue,
  emptyText,
  nameMask = null,
  color = P365.teal,
  ariaLabel,
}: {
  items: FacetItem[]
  formatValue: (value: number) => string
  emptyText: string
  nameMask?: NameMask | null
  color?: string
  ariaLabel: string
}) {
  if (items.length === 0) return <EmptyBlock>{emptyText}</EmptyBlock>
  const max = items.reduce((top, item) => Math.max(top, item.value), 1)

  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <li key={`${index}-${item.name}`} className="flex items-center gap-3">
          {item.pool && <PoolIcon pool={item.pool} />}
          <div className="relative flex h-7 min-w-0 flex-1 items-center">
            <span
              data-slot="facet-bar"
              className="absolute inset-y-0 left-0 rounded-sm"
              style={facetStyle(item, index, color, max)}
              aria-hidden="true"
            />
            {nameMask === null ? (
              <span title={item.name} className="relative min-w-0 truncate px-2 text-xs font-semibold text-p365-navy">
                {item.name}
              </span>
            ) : (
              <HiddenName
                mask={nameMask}
                seed={item.name}
                className="relative px-2 text-xs font-semibold text-p365-navy"
              />
            )}
          </div>
          <span className="tabular shrink-0 text-xs text-p365-grey-700">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  )
}
