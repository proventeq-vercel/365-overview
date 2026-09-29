import { graphProxyOf, type AppConfig } from './appConfig'

export type AccessMode = 'application' | 'delegated'

export const ACCESS_MODES: readonly AccessMode[] = ['application', 'delegated']

export function accessModeOf(config: AppConfig): AccessMode {
  return graphProxyOf(config) ? 'application' : 'delegated'
}
