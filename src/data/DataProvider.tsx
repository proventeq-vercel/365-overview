import { useMsal } from '@azure/msal-react'
import { useMemo, type ReactNode } from 'react'
import { env } from '../config/env'
import { createMockDataSource, type DataSource } from './fixtures'
import { buildLiveSource, buildLocalAuthSource } from './sources'
import { DataSourceContext } from './useDataSource'

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
