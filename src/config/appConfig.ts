export interface AppConfig {
  VITE_CLIENT_ID: string
  VITE_AUTHORITY_URI: string
  VITE_REDIRECT_URI: string
}

export const DEFAULT_AUTH = {
  clientId: '84e24db0-8904-41f8-8556-14a2b6863b1a',
  authority: 'https://login.microsoftonline.com/organizations',
} as const

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
  }
}

export function getConfig(): AppConfig {
  if (!_config) {
    _config = parseConfig(import.meta.env, window.location.origin)
  }
  return _config
}
