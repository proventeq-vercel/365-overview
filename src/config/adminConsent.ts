import { getConfig, graphProxyOf, type AppConfig } from './appConfig'
import { env } from './env'

const CONSENT_ENDPOINT = 'https://login.microsoftonline.com/organizations/adminconsent'

export function buildAdminConsentUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
  return `${CONSENT_ENDPOINT}?${params.toString()}`
}

const API_SCOPE_PREFIX = 'api://'

const APPLICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function clientIdOfScope(scope: string): string | null {
  if (!scope.startsWith(API_SCOPE_PREFIX)) return null
  const resource = scope.slice(API_SCOPE_PREFIX.length).split('/').slice(0, -1)
  return resource.find((segment) => APPLICATION_ID.test(segment)) ?? null
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
