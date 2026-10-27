import type { MockScenario } from '../data/fixtures'

const SCENARIO_SET: Record<MockScenario, true> = {
  healthy: true,
  'over-entitlement': true,
  concealed: true,
  'short-history': true,
  'onedrive-over-licence': true,
  'nothing-to-clean': true,
  'no-licences': true,
  'first-day': true,
}

export const MOCK_SCENARIOS = Object.keys(SCENARIO_SET) as MockScenario[]
