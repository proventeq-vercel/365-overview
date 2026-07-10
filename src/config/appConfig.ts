/**
 * Application auth configuration, read from build-time Vite env vars
 * (`import.meta.env.VITE_*`). Values are baked into the bundle at build time, so
 * on Vercel they come from the project's Environment Variables. For local dev,
 * copy `.env.example` to `.env` and fill in the three auth values.
 *
 * In mock mode (`env.useMock`) this is never read — {@link getConfig} is only
 * called from the MSAL setup, which runs in live mode only.
 */
export interface AppConfig {
  VITE_CLIENT_ID: string
  VITE_AUTHORITY_URI: string
  VITE_REDIRECT_URI: string
}

const REQUIRED_KEYS = [
  'VITE_CLIENT_ID',
  'VITE_AUTHORITY_URI',
  'VITE_REDIRECT_URI',
] as const

let _config: AppConfig | null = null

/**
 * Validate an env source (typically `import.meta.env`) into an {@link AppConfig}.
 * Pure (no import.meta access) so it is unit-testable in isolation. Throws a
 * clear, actionable error if the source is not an object or is missing any
 * required, non-empty string key.
 */
export function parseConfig(source: unknown): AppConfig {
  if (!source || typeof source !== 'object') {
    throw new Error(
      'App config source is not an object. Copy .env.example to .env and fill ' +
        'in the VITE_* auth values (or set them in your Vercel project settings).',
    )
  }
  const env = source as Record<string, unknown>
  for (const key of REQUIRED_KEYS) {
    if (typeof env[key] !== 'string' || env[key] === '') {
      throw new Error(
        `Missing required environment variable "${key}". Copy .env.example to ` +
          '.env and fill in all three VITE_* auth values (or set them in your ' +
          'Vercel project settings).',
      )
    }
  }
  return {
    VITE_CLIENT_ID: env.VITE_CLIENT_ID as string,
    VITE_AUTHORITY_URI: env.VITE_AUTHORITY_URI as string,
    VITE_REDIRECT_URI: env.VITE_REDIRECT_URI as string,
  }
}

/**
 * Return the validated auth config, read from build-time `import.meta.env` and
 * cached. Throws (via {@link parseConfig}) if any required VITE_* var is missing
 * — call it eagerly during live-mode bootstrap so a misconfiguration surfaces as
 * a clear error rather than a render crash. Never called in mock mode.
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = parseConfig(import.meta.env)
  }
  return _config
}
