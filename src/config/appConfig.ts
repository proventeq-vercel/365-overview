export interface AppConfig {
  VITE_CLIENT_ID: string
  VITE_AUTHORITY_URI: string
  VITE_REDIRECT_URI: string
}

export const DEFAULT_AUTH = {
  clientId: 'a6036483-bd4e-44d4-896f-33d6547eb66d',
  authority: 'https://login.microsoftonline.com/d3d3b20f-00ce-4a0f-9975-d79117daa055',
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
