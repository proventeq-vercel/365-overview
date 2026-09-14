import type { MockScenario } from '../data/fixtures'
import { readFeatures, type FeatureFlag } from './featureFlags'
import { isModesLocked, readModeOverrides, type ModeOverrides } from './modes'

export interface AppEnv {
  useMock: boolean
  mockScenario: MockScenario
  features: ReadonlySet<FeatureFlag>
  modesLocked: boolean
}

const SCENARIOS: MockScenario[] = [
  'healthy',
  'over-entitlement',
  'concealed',
  'short-history',
]

function readScenario(value: string | undefined): MockScenario {
  return SCENARIOS.find((scenario) => scenario === value) ?? 'healthy'
}

export function readEnv(
  source: Record<string, string | undefined>,
  overrides: ModeOverrides = {},
): AppEnv {
  const locked = isModesLocked(source)
  const active = locked ? {} : overrides
  return {
    useMock: (active.useMock ?? source.VITE_USE_MOCK) === 'true',
    mockScenario: readScenario(active.mockScenario ?? source.VITE_MOCK_SCENARIO),
    features: readFeatures(active.features ?? source.VITE_FEATURES),
    modesLocked: locked,
  }
}

function browserOverrides(source: Record<string, string | undefined>): ModeOverrides {
  if (typeof window === 'undefined' || isModesLocked(source)) return {}
  return readModeOverrides(window.location.search, window.sessionStorage)
}

const source = import.meta.env as unknown as Record<string, string | undefined>

export const env: AppEnv = readEnv(source, browserOverrides(source))
