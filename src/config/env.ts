import type { MockScenario } from '../data/fixtures'

export interface AppEnv {
  useMock: boolean
  mockScenario: MockScenario
  showMenu: boolean
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

export function readEnv(source: Record<string, string | undefined>): AppEnv {
  return {
    useMock: source.VITE_USE_MOCK === 'true',
    mockScenario: readScenario(source.VITE_MOCK_SCENARIO),
    showMenu: source.VITE_SHOW_MENU === 'true',
  }
}

export const env: AppEnv = readEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
)
