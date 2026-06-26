/**
 * Runtime application configuration, loaded from `/env.json` at startup (live
 * mode only). Mirrors the ProventeqCloud Frontend `config.ts` pattern: values
 * are fetched at runtime rather than baked in at build time, so the same bundle
 * can be deployed to multiple environments.
 *
 * In mock mode (`env.useMock`) this is never loaded — the app must not fetch
 * `/env.json`.
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
 * Validate a parsed `env.json` payload into an {@link AppConfig}. Pure (no
 * fetch) so it is unit-testable in isolation. Throws a clear error if the
 * payload is not an object or is missing any required, non-empty string key.
 */
export function parseConfig(json: unknown): AppConfig {
  if (!json || typeof json !== 'object') {
    throw new Error(
      'env.json is empty or not a JSON object. Copy public/env.sample.json to ' +
        'public/env.json and fill in your local values.',
    )
  }
  const source = json as Record<string, unknown>
  for (const key of REQUIRED_KEYS) {
    if (typeof source[key] !== 'string' || source[key] === '') {
      throw new Error(
        `env.json is missing required key "${key}". Copy public/env.sample.json ` +
          'to public/env.json and fill in all three keys.',
      )
    }
  }
  return {
    VITE_CLIENT_ID: source.VITE_CLIENT_ID as string,
    VITE_AUTHORITY_URI: source.VITE_AUTHORITY_URI as string,
    VITE_REDIRECT_URI: source.VITE_REDIRECT_URI as string,
  }
}

/**
 * Fetch and validate `/env.json`, storing it for {@link getConfig}. Call once
 * during live-mode bootstrap before any MSAL/config access. Throws with a clear,
 * actionable message if the file is missing or served as HTML (the typical
 * "forgot to create env.json" failure mode).
 */
export async function loadConfig(): Promise<void> {
  const res = await fetch('/env.json', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(
      `env.json not found (HTTP ${res.status}). Copy public/env.sample.json to ` +
        'public/env.json, fill in your local values, and ensure it is served at ' +
        'the root (Vite serves the public/ directory at /).',
    )
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) {
    throw new Error(
      'env.json not found — the server returned HTML instead of JSON. Ensure ' +
        'public/env.json exists (it is loaded at runtime from /env.json).',
    )
  }
  _config = parseConfig(await res.json())
}

/** Return the loaded config, or throw if {@link loadConfig} has not run. */
export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error('Config not loaded — call loadConfig() before getConfig().')
  }
  return _config
}
