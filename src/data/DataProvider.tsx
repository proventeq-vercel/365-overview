import { useMsal } from '@azure/msal-react'
import { useQueryClient } from '@tanstack/react-query'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { adminHref, appliedChoice } from '../config/adminHref'
import { env, type AppEnv } from '../config/env'
import { tabStorage, writeModeOverrides } from '../config/modes'
import { createMockDataSource, type DataSource, type MockScenario } from './fixtures'
import { MockDataContext, readMockDelay, rememberMockDelay, type MockDataState } from './mockData'
import { buildLiveSource, buildLocalAuthSource } from './sources'
import { DataSourceContext } from './useDataSource'

export type MockEnv = Pick<AppEnv, 'mockScenario' | 'hideNames' | 'features'>

function LiveDataProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()
  const dataSource = useMemo<DataSource>(
    () => buildLiveSource(instance, accounts, env.hideNames),
    [instance, accounts],
  )
  return <DataSourceContext value={dataSource}>{children}</DataSourceContext>
}

function LocalAuthDataProvider({ localAuthUrl, children }: { localAuthUrl: string; children: ReactNode }) {
  const dataSource = useMemo<DataSource>(
    () => buildLocalAuthSource(localAuthUrl, env.hideNames),
    [localAuthUrl],
  )
  return <DataSourceContext value={dataSource}>{children}</DataSourceContext>
}

function rememberMockScenario(mockEnv: MockEnv, scenario: MockScenario) {
  writeModeOverrides(tabStorage(), { mockScenario: scenario })
  window.history.replaceState(
    window.history.state,
    '',
    adminHref(window.location.pathname, appliedChoice(mockEnv, scenario)),
  )
}

export function MockDataProvider({ mockEnv, children }: { mockEnv: MockEnv; children: ReactNode }) {
  const queryClient = useQueryClient()
  const [{ scenario, generation }, setLoaded] = useState({ scenario: mockEnv.mockScenario, generation: 0 })
  const [delayMs, setDelayMs] = useState(readMockDelay)
  const dataSource = useMemo<DataSource>(
    () => createMockDataSource(scenario, { hideNames: mockEnv.hideNames, delayMs }),
    [scenario, delayMs, mockEnv.hideNames],
  )
  const mockData = useMemo<MockDataState>(
    () => ({
      scenario,
      delayMs,
      setScenario: (next) => {
        rememberMockScenario(mockEnv, next)
        queryClient.clear()
        setLoaded((loaded) => ({ scenario: next, generation: loaded.generation + 1 }))
      },
      setDelayMs: (next) => {
        rememberMockDelay(next)
        setDelayMs(next)
      },
    }),
    [scenario, delayMs, mockEnv, queryClient],
  )
  return (
    <MockDataContext value={mockData}>
      <DataSourceContext value={dataSource}>
        <Fragment key={generation}>{children}</Fragment>
      </DataSourceContext>
    </MockDataContext>
  )
}

export function DataProvider({ children }: { children: ReactNode }) {
  if (env.useMock) return <MockDataProvider mockEnv={env}>{children}</MockDataProvider>
  if (env.localAuthUrl) {
    return <LocalAuthDataProvider localAuthUrl={env.localAuthUrl}>{children}</LocalAuthDataProvider>
  }
  return <LiveDataProvider>{children}</LiveDataProvider>
}
