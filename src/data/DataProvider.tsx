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
 * resolved lazily (per token request) so that a sign-in completed after the
 * provider mounts is picked up. A LoginGate (Task 11) wraps this provider, so an
 * active account can be assumed when live methods are actually called; if none
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

function buildLiveSource(instance: IPublicClientApplication, accounts: AccountInfo[]): DataSource {
  const getAccount = () => instance.getActiveAccount() ?? accounts[0] ?? null
  const graph = createGraphClient(makeTokenGetter(instance, getAccount, GRAPH_SCOPES))
  const arm = createArmClient(makeTokenGetter(instance, getAccount, ARM_SCOPES))
  return createLiveDataSource(graph, arm)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()

  const dataSource = useMemo<DataSource>(
    () => (env.useMock ? createMockDataSource() : buildLiveSource(instance, accounts)),
    [instance, accounts],
  )

  return <DataSourceContext value={dataSource}>{children}</DataSourceContext>
}
