import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { createLocalTokenGetter } from '../auth/localAuth'
import { requiredScopeFor, tokenScopesFor } from '../auth/msalConfig'
import { acquireToken } from '../auth/tokens'
import { createGraphClient, GRAPH_ORIGIN } from '../clients/graphClient'
import { getConfig, graphProxyOf, type AppConfig } from '../config/appConfig'
import type { DataSource } from './fixtures'
import { createLiveDataSource } from './live'

function makeTokenGetter(
  instance: IPublicClientApplication,
  getAccount: () => AccountInfo | null,
  scopes: string[],
  requiredScope: string | undefined,
): () => Promise<string> {
  return async () => {
    const account = getAccount()
    if (!account) {
      throw new Error('No active MSAL account; sign in before requesting data')
    }
    return acquireToken(instance, account, scopes, requiredScope)
  }
}

const graphOriginOf = (config: AppConfig) => graphProxyOf(config)?.url ?? GRAPH_ORIGIN

export function buildLiveSource(
  instance: IPublicClientApplication,
  accounts: AccountInfo[],
  hideNames: boolean,
  config: AppConfig = getConfig(),
): DataSource {
  const getAccount = () => instance.getActiveAccount() ?? accounts[0] ?? null
  const getToken = makeTokenGetter(instance, getAccount, tokenScopesFor(config), requiredScopeFor(config))
  return createLiveDataSource(createGraphClient(getToken, fetch, graphOriginOf(config)), { hideNames })
}

export function buildLocalAuthSource(
  localAuthUrl: string,
  hideNames: boolean,
  config: AppConfig = getConfig(),
): DataSource {
  const proxy = graphProxyOf(config)
  if (!proxy) {
    throw new Error('VITE_LOCAL_AUTH_URL needs VITE_GRAPH_PROXY_URL: local auth only works through the proxy')
  }
  return createLiveDataSource(createGraphClient(createLocalTokenGetter(localAuthUrl), fetch, proxy.url), {
    hideNames,
  })
}
