import { getConfig, type AppConfig } from './appConfig'
import { env } from './env'

const CONSENT_ENDPOINT = 'https://login.microsoftonline.com/organizations/adminconsent'

export function buildAdminConsentUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
  return `${CONSENT_ENDPOINT}?${params.toString()}`
}

export function adminConsentUrlFor(config: AppConfig): string {
  return buildAdminConsentUrl(config.VITE_CLIENT_ID, config.VITE_REDIRECT_URI)
}

export function adminConsentUrl(): string | null {
  if (!env.usesMsal) return null
  return adminConsentUrlFor(getConfig())
}
