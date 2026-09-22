import { getConfig, graphProxyOf, type AppConfig } from './appConfig'
import { env } from './env'

const CONSENT_ENDPOINT = 'https://login.microsoftonline.com/organizations/adminconsent'

export function buildAdminConsentUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
  return `${CONSENT_ENDPOINT}?${params.toString()}`
}

const PROXY_SCOPE_CLIENT_ID = /^api:\/\/([^/]+)\//

export function consentClientIdFor(config: AppConfig): string {
  const proxy = graphProxyOf(config)
  const named = proxy ? PROXY_SCOPE_CLIENT_ID.exec(proxy.scope)?.[1] : null
  return named ?? config.VITE_CLIENT_ID
}

export function adminConsentUrlFor(config: AppConfig): string {
  return buildAdminConsentUrl(consentClientIdFor(config), config.VITE_REDIRECT_URI)
}

export function adminConsentUrl(): string | null {
  if (!env.usesMsal) return null
  return adminConsentUrlFor(getConfig())
}
