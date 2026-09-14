import type { ForecastStatus } from '@/types/storage'

export const P365 = {
  navy: '#0f2c3d',
  blue: '#16475c',
  teal: '#34a1a0',
  red: '#f94545',
  orange: '#f97f50',
  yellow: '#edba20',
  green: '#82bc17',
  grey100: '#dedede',
  grey400: '#a6a6a6',
  grey500: '#808080',
  grey700: '#434343',
} as const

export interface LabelTone {
  text: string
  background: string
}

export const LABEL_TONES = {
  green: { text: '#82bc17', background: '#e6f2d1' },
  orange: { text: '#f97f50', background: 'rgba(249, 127, 80, 0.10)' },
  red: { text: '#f94545', background: '#fedada' },
  grey: { text: '#6b7280', background: '#f3f4f6' },
} as const satisfies Record<string, LabelTone>

export const RISK_COLOR: Record<ForecastStatus, string> = {
  Healthy: P365.green,
  Warning: P365.orange,
  Critical: P365.red,
  Unknown: P365.grey400,
}

export const RISK_LABEL: Record<ForecastStatus, LabelTone> = {
  Healthy: LABEL_TONES.green,
  Warning: LABEL_TONES.orange,
  Critical: LABEL_TONES.red,
  Unknown: LABEL_TONES.grey,
}

export function monoColor(index: number, total: number): string {
  const span = total > 1 ? index / (total - 1) : 0
  const lightness = Math.round(25 + span * 55)
  return `hsl(200, 45%, ${lightness}%)`
}

const FACET_TINT_CYCLE = [50, 40, 30, 22, 15, 10]

export function facetFill(index: number): string {
  const percent = FACET_TINT_CYCLE[index % FACET_TINT_CYCLE.length]
  return `color-mix(in srgb, ${P365.teal} ${percent}%, white)`
}

export const CHART_GRID = '#f0f0f0'
export const CHART_TICK = { fill: P365.grey500, fontSize: 11 } as const
