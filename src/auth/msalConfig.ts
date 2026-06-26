import { type Configuration, PublicClientApplication } from '@azure/msal-browser'
import { getConfig } from '../config/appConfig'

let _msalInstance: PublicClientApplication | null = null

/**
 * Lazy singleton MSAL instance, built from the runtime config loaded via
 * `loadConfig()`. Mirrors the ProventeqCloud `getMsalInstance()` pattern:
 * `cacheLocation: 'localStorage'` and a full-URI authority. Only call this in
 * live mode (after `loadConfig()` has run) — mock mode never touches MSAL.
 */
export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    const c = getConfig()
    const msalConfig: Configuration = {
      auth: {
        clientId: c.VITE_CLIENT_ID,
        authority: c.VITE_AUTHORITY_URI,
        redirectUri: c.VITE_REDIRECT_URI,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    }
    _msalInstance = new PublicClientApplication(msalConfig)
  }
  return _msalInstance
}

export const GRAPH_SCOPES = ['User.Read', 'Reports.Read.All', 'Organization.Read.All']
export const ARM_SCOPES = ['https://management.azure.com/user_impersonation']
