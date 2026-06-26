import type { Configuration } from '@azure/msal-browser'
import { env } from '../config/env'

export const msalConfig: Configuration = {
  auth: {
    clientId: env.clientId,
    authority: `https://login.microsoftonline.com/${env.tenantId}`,
    redirectUri: env.redirectUri,
  },
  cache: { cacheLocation: 'sessionStorage' },
}

export const GRAPH_SCOPES = ['User.Read', 'Reports.Read.All', 'Organization.Read.All']
export const ARM_SCOPES = ['https://management.azure.com/user_impersonation']
