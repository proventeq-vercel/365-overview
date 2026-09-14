import { type Configuration, PublicClientApplication } from '@azure/msal-browser'
import { getConfig } from '../config/appConfig'

let _msalInstance: PublicClientApplication | null = null

/**
 * Lazy singleton MSAL instance, built from the build-time config read via
 * `getConfig()` (`import.meta.env.VITE_*`). Mirrors the ProventeqCloud
 * `getMsalInstance()` pattern: `cacheLocation: 'localStorage'` and a full-URI
 * authority. Only call this in live mode — mock mode never touches MSAL.
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
