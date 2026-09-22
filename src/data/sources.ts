import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { createLocalTokenGetter } from '../auth/localAuth'
import { tokenScopesFor } from '../auth/msalConfig'
import { acquireToken } from '../auth/tokens'
import { createGraphClient, GRAPH_ORIGIN } from '../clients/graphClient'
import { getConfig, graphProxyOf, type AppConfig } from '../config/appConfig'
import type { DataSource } from './fixtures'
import { createLiveDataSource } from './live'

/**
 * Build a token getter bound to the currently active account. The account is
 * resolved lazily (per token request) so a sign-in completed after the provider
 * mounts is picked up. `MsalAuthHandler` gates the live app on an authenticated
 * account, so one can normally be assumed when live methods are called; if none
 * is present we fail fast with a clear error rather than calling Graph
 * unauthenticated.
 */
function makeTokenGetter(
  instance: IPublicClientApplication,
  getAccount: () => AccountInfo | null,
  scopes: string[],
): () => Promise<string> {
  return async () => {
    const account = getAccount()
    if (!account) {
      throw new Error('No active MSAL account; sign in before requesting data')
    }
    return acquireToken(instance, account, scopes)
  }
}

const graphOriginOf = (config: AppConfig) => graphProxyOf(config)?.url ?? GRAPH_ORIGIN

export function buildLiveSource(
  instance: IPublicClientApplication,
  accounts: AccountInfo[],
  config: AppConfig = getConfig(),
): DataSource {
  const getAccount = () => instance.getActiveAccount() ?? accounts[0] ?? null
  const getToken = makeTokenGetter(instance, getAccount, tokenScopesFor(config))
  return createLiveDataSource(createGraphClient(getToken, fetch, graphOriginOf(config)))
}

export function buildLocalAuthSource(localAuthUrl: string, config: AppConfig = getConfig()): DataSource {
  const proxy = graphProxyOf(config)
  if (!proxy) {
    throw new Error('VITE_LOCAL_AUTH_URL needs VITE_GRAPH_PROXY_URL: local auth only works through the proxy')
  }
  return createLiveDataSource(createGraphClient(createLocalTokenGetter(localAuthUrl), fetch, proxy.url))
}
