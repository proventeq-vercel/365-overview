import type { HealthStatus } from '@/lib/thresholds'

/** Brand-ordered series palette. Index → meaning is stable across all charts. */
export const CHART_COLORS = ['#34a1a0', '#f98d50', '#2e9cc7', '#eab000', '#b1eb46']

export const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: '#34a1a0',
  watch: '#eab000',
  attention: '#f98d50',
}

export const AXIS_INK = '#16475c'
export const GRID_STROKE = '#e3e6ea'
export const TICK = { fill: '#6b7280', fontSize: 12 } as const
