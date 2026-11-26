import type { HealthStatus } from '@/lib/thresholds'
import type { ForecastStatus, Workload } from '@/types/storage'

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

export const P365_TEXT = {
  grey: '#6a6a6a',
  teal: '#267574',
  red: '#c70606',
  orange: '#c03a07',
  yellow: '#83650b',
  green: '#50730e',
} as const

const TEXT_SHADE: Record<string, string> = {
  [P365.grey500]: P365_TEXT.grey,
  [P365.grey400]: P365_TEXT.grey,
  [P365.grey100]: P365_TEXT.grey,
  [P365.teal]: P365_TEXT.teal,
  [P365.red]: P365_TEXT.red,
  [P365.orange]: P365_TEXT.orange,
  [P365.yellow]: P365_TEXT.yellow,
  [P365.green]: P365_TEXT.green,
}

export function textShade(color: string): string {
  return TEXT_SHADE[color] ?? color
}

export const WORKLOAD_COLOR = {
  sharePoint: '#038387',
  oneDrive: '#0078d4',
  teams: '#5b5fc7',
} as const satisfies Record<Workload, string>

export interface LabelTone {
  text: string
  background: string
}

export const LABEL_TONES = {
  green: { text: P365_TEXT.green, background: '#e6f2d1' },
  orange: { text: P365_TEXT.orange, background: 'rgba(249, 127, 80, 0.10)' },
  red: { text: P365_TEXT.red, background: '#fedada' },
  grey: { text: P365_TEXT.grey, background: '#f3f4f6' },
} as const satisfies Record<string, LabelTone>

export const RISK_COLOR: Record<ForecastStatus, string> = {
  Healthy: P365.green,
  Warning: P365.orange,
  Critical: P365.red,
  Unknown: P365.grey400,
}

export const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: P365.green,
  watch: P365.orange,
  attention: P365.red,
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
