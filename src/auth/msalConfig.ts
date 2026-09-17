import { type Configuration, PublicClientApplication } from '@azure/msal-browser'
import { getConfig } from '../config/appConfig'

let _msalInstance: PublicClientApplication | null = null

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

export const GRAPH_SCOPES = [
  'User.Read',
  'Reports.Read.All',
  'Organization.Read.All',
  'Sites.Read.All',
  'ReportSettings.Read.All',
]
