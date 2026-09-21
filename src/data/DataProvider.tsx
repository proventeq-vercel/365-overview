import { useMsal } from '@azure/msal-react'
import { useMemo, type ReactNode } from 'react'
import { acquireToken } from '../auth/tokens'
import { createLocalTokenGetter } from '../auth/localAuth'
import { tokenScopesFor } from '../auth/msalConfig'
import { createGraphClient, GRAPH_ORIGIN } from '../clients/graphClient'
import { getConfig, graphProxyOf, type AppConfig } from '../config/appConfig'
import { env } from '../config/env'
import type { IPublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { createMockDataSource, type DataSource } from './fixtures'
import { createLiveDataSource } from './live'
import { DataSourceContext } from './useDataSource'

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

/**
 * Live-mode provider. Calls `useMsal()` — so it is only ever mounted inside an
 * `MsalProvider` (live mode). Mock mode never renders this, keeping mock mode
 * MSAL-free end to end.
 */
function LiveDataProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()
  const dataSource = useMemo<DataSource>(
    () => buildLiveSource(instance, accounts),
    [instance, accounts],
  )
  return <DataSourceContext value={dataSource}>{children}</DataSourceContext>
}

function LocalAuthDataProvider({ localAuthUrl, children }: { localAuthUrl: string; children: ReactNode }) {
  const dataSource = useMemo<DataSource>(() => buildLocalAuthSource(localAuthUrl), [localAuthUrl])
  return <DataSourceContext value={dataSource}>{children}</DataSourceContext>
}

/**
 * Provides a `DataSource` to the app. In mock mode it supplies fixture data and
 * never touches MSAL; with a local auth stack (dev server only) it reads through
 * the proxy with a token minted by that stack; otherwise it delegates to
 * `LiveDataProvider` (which is the only place `useMsal()` is called for data).
 */
export function DataProvider({ children }: { children: ReactNode }) {
  if (env.useMock) {
    return (
      <DataSourceContext value={createMockDataSource(env.mockScenario)}>
        {children}
      </DataSourceContext>
    )
  }
  if (env.localAuthUrl) {
    return <LocalAuthDataProvider localAuthUrl={env.localAuthUrl}>{children}</LocalAuthDataProvider>
  }
  return <LiveDataProvider>{children}</LiveDataProvider>
}
