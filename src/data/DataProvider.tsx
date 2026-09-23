import { useMsal } from '@azure/msal-react'
import { useMemo, type ReactNode } from 'react'
import { env } from '../config/env'
import { createMockDataSource, type DataSource } from './fixtures'
import { buildLiveSource, buildLocalAuthSource } from './sources'
import { DataSourceContext } from './useDataSource'

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
