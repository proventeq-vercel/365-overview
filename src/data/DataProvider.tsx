import { useMsal } from '@azure/msal-react'
import { useMemo, type ReactNode } from 'react'
import { acquireToken } from '../auth/tokens'
import { ARM_SCOPES, GRAPH_SCOPES } from '../auth/msalConfig'
import { createArmClient } from '../clients/armClient'
import { createGraphClient } from '../clients/graphClient'
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
 * is present we fail fast with a clear error rather than calling Graph/ARM
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

function buildLiveSource(
  instance: IPublicClientApplication,
  accounts: AccountInfo[],
): DataSource {
  const getAccount = () => instance.getActiveAccount() ?? accounts[0] ?? null
  const graph = createGraphClient(makeTokenGetter(instance, getAccount, GRAPH_SCOPES))
  const arm = createArmClient(makeTokenGetter(instance, getAccount, ARM_SCOPES))
  return createLiveDataSource(graph, arm)
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

/**
 * Provides a `DataSource` to the app. In mock mode it supplies fixture data and
 * never touches MSAL; in live mode it delegates to `LiveDataProvider` (which is
 * the only place `useMsal()` is called for data).
 */
export function DataProvider({ children }: { children: ReactNode }) {
  if (env.useMock) {
    return (
      <DataSourceContext value={createMockDataSource()}>
        {children}
      </DataSourceContext>
    )
  }
  return <LiveDataProvider>{children}</LiveDataProvider>
}
