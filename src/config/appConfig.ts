export interface AppConfig {
  VITE_CLIENT_ID: string
  VITE_AUTHORITY_URI: string
  VITE_REDIRECT_URI: string
  VITE_GRAPH_PROXY_URL: string | null
  VITE_GRAPH_PROXY_SCOPE: string | null
}

export interface GraphProxy {
  url: string
  scope: string
}

export const DEFAULT_AUTH = {
  clientId: '84e24db0-8904-41f8-8556-14a2b6863b1a',
  authority: 'https://login.microsoftonline.com/organizations',
} as const

export const PROXY_SCOPE_NAME = 'access_as_user'

let _config: AppConfig | null = null

function valueOf(source: unknown, key: keyof AppConfig): string | null {
  if (!source || typeof source !== 'object') return null
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export function parseConfig(source: unknown, origin: string): AppConfig {
  return {
    VITE_CLIENT_ID: valueOf(source, 'VITE_CLIENT_ID') ?? DEFAULT_AUTH.clientId,
    VITE_AUTHORITY_URI: valueOf(source, 'VITE_AUTHORITY_URI') ?? DEFAULT_AUTH.authority,
    VITE_REDIRECT_URI: valueOf(source, 'VITE_REDIRECT_URI') ?? `${origin}/`,
    VITE_GRAPH_PROXY_URL: valueOf(source, 'VITE_GRAPH_PROXY_URL')?.replace(/\/+$/, '') ?? null,
    VITE_GRAPH_PROXY_SCOPE: valueOf(source, 'VITE_GRAPH_PROXY_SCOPE'),
  }
}

export function graphProxyOf(config: AppConfig): GraphProxy | null {
  if (!config.VITE_GRAPH_PROXY_URL) return null
  return {
    url: config.VITE_GRAPH_PROXY_URL,
    scope: config.VITE_GRAPH_PROXY_SCOPE ?? `api://${config.VITE_CLIENT_ID}/${PROXY_SCOPE_NAME}`,
  }
}

export function getConfig(): AppConfig {
  if (!_config) {
    _config = parseConfig(import.meta.env, window.location.origin)
  }
  return _config
}
