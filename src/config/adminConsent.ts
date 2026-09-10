import { env } from './env'

const CONSENT_ENDPOINT = 'https://login.microsoftonline.com/organizations/adminconsent'

export function buildAdminConsentUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri })
  return `${CONSENT_ENDPOINT}?${params.toString()}`
}

export function adminConsentUrl(): string | null {
  if (env.useMock) return null
  const source = import.meta.env as unknown as Record<string, string | undefined>
  const clientId = source.VITE_CLIENT_ID
  const redirectUri = source.VITE_REDIRECT_URI
  if (!clientId || !redirectUri) return null
  return buildAdminConsentUrl(clientId, redirectUri)
}
