import type { MockScenario } from '../data/fixtures'
import { FeatureFlags, type FeatureFlag } from './featureFlags'
import { MODES_RESET_PARAM, MODES_RESET_VALUE } from './modes'

export const NO_FEATURES = 'none'

export type AdminDataSource = 'live' | MockScenario

export interface AdminChoice {
  features: readonly FeatureFlag[]
  data: AdminDataSource
  hideNames: boolean
}

export function adminHref(pathname: string, choice: AdminChoice): string {
  const params = new URLSearchParams({
    features: choice.features.length === 0 ? NO_FEATURES : choice.features.join(','),
    mock: choice.data === 'live' ? 'false' : 'true',
    scenario: choice.data === 'live' ? '' : choice.data,
    hideNames: choice.hideNames ? 'true' : '',
    admin: 'true',
  })
  return `${pathname}?${params.toString()}`
}

export function appliedChoice(
  { features, hideNames }: { features: ReadonlySet<FeatureFlag>; hideNames: boolean },
  data: AdminDataSource,
): AdminChoice {
  return { features: Object.values(FeatureFlags).filter((flag) => features.has(flag)), data, hideNames }
}

export function isScenarioOnlyChange(choice: AdminChoice, current: AdminChoice): boolean {
  return (
    choice.data !== 'live' &&
    current.data !== 'live' &&
    choice.data !== current.data &&
    adminHref('/', { ...choice, data: current.data }) === adminHref('/', current)
  )
}

export function adminResetHref(pathname: string): string {
  const params = new URLSearchParams({ [MODES_RESET_PARAM]: MODES_RESET_VALUE, admin: 'true' })
  return `${pathname}?${params.toString()}`
}
