import type { MockScenario } from '../data/fixtures'
import { readFeatures, type FeatureFlag } from './featureFlags'
import { isModesLocked, readModeOverrides, tabStorage, type ModeOverrides } from './modes'

export interface AppEnv {
  useMock: boolean
  mockScenario: MockScenario
  features: ReadonlySet<FeatureFlag>
  modesLocked: boolean
  overrides: ModeOverrides
  localAuthUrl: string | null
  usesMsal: boolean
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

function readLocalAuthUrl(value: string | undefined, devServer: boolean): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '')
  return devServer && trimmed ? trimmed : null
}

export function readEnv(
  source: Record<string, string | undefined>,
  overrides: ModeOverrides = {},
  devServer = false,
): AppEnv {
  const locked = isModesLocked(source)
  const active = locked ? {} : overrides
  const useMock = (active.useMock ?? source.VITE_USE_MOCK) === 'true'
  const localAuthUrl = useMock ? null : readLocalAuthUrl(source.VITE_LOCAL_AUTH_URL, devServer)
  return {
    useMock,
    mockScenario: readScenario(active.mockScenario ?? source.VITE_MOCK_SCENARIO),
    features: readFeatures(active.features ?? source.VITE_FEATURES),
    modesLocked: locked,
    overrides: active,
    localAuthUrl,
    usesMsal: !useMock && !localAuthUrl,
  }
}

function browserOverrides(source: Record<string, string | undefined>): ModeOverrides {
  if (typeof window === 'undefined' || isModesLocked(source)) return {}
  return readModeOverrides(window.location.search, tabStorage())
}

const source = import.meta.env as unknown as Record<string, string | undefined>

export const env: AppEnv = readEnv(source, browserOverrides(source), import.meta.env.DEV)
