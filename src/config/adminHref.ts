import type { MockScenario } from '../data/fixtures'
import type { FeatureFlag } from './featureFlags'
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

export function adminResetHref(pathname: string): string {
  const params = new URLSearchParams({ [MODES_RESET_PARAM]: MODES_RESET_VALUE, admin: 'true' })
  return `${pathname}?${params.toString()}`
}
