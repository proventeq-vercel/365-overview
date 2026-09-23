import { getConfig, graphProxyOf, type AppConfig } from './appConfig'
import { env } from './env'

const CONSENT_ENDPOINT = 'https://login.microsoftonline.com/organizations/adminconsent'

export function buildAdminConsentUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
  return `${CONSENT_ENDPOINT}?${params.toString()}`
}

const API_SCOPE_PREFIX = 'api://'

function clientIdOfScope(scope: string): string | null {
  if (!scope.startsWith(API_SCOPE_PREFIX)) return null
  const segments = scope.slice(API_SCOPE_PREFIX.length).split('/')
  return segments.length > 1 ? (segments.at(-2) ?? null) || null : null
}

export function consentClientIdFor(config: AppConfig): string {
  const proxy = graphProxyOf(config)
  return (proxy ? clientIdOfScope(proxy.scope) : null) ?? config.VITE_CLIENT_ID
}

export function adminConsentUrlFor(config: AppConfig): string {
  return buildAdminConsentUrl(consentClientIdFor(config), config.VITE_REDIRECT_URI)
}

export function adminConsentUrl(): string | null {
  if (!env.usesMsal) return null
  return adminConsentUrlFor(getConfig())
}
