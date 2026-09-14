import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import App from './App'

const envState = vi.hoisted(() => ({ features: new Set<string>() }))

vi.mock('@/config/env', () => ({
  env: { useMock: true, mockScenario: 'healthy', features: envState.features, overrides: {} },
}))

vi.mock('@/features/registry', async () => {
  const { HardDrive, Users } = await import('lucide-react')
  const REPORTS = [
    { id: 'storage', path: '/storage', titleKey: 'reports.storageOptimisation.title', icon: HardDrive, requireFeature: 'flag.storage', Component: () => <h1>Storage report</h1> },
    { id: 'sharing', path: '/sharing', titleKey: 'reports.oneDriveUsage.title', icon: Users, requireFeature: 'flag.sharing', Component: () => <h1>Sharing report</h1> },
  ]
  return { REPORTS, enabledReports: (features: ReadonlySet<string>) => REPORTS.filter((r) => features.has(r.requireFeature)) }
})

function LocationProbe() {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()
  return (
    <>
      <output data-testid="location">{pathname + search}</output>
      <output data-testid="navigation-type">{navigationType}</output>
    </>
  )
}

function renderAt(path: string, features = ['flag.storage', 'flag.sharing']) {
  envState.features.clear()
  for (const flag of features) envState.features.add(flag)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <MemoryRouter initialEntries={[path]}>
            {children}
            <LocationProbe />
          </MemoryRouter>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<App />, { wrapper: Wrapper })
}

afterEach(cleanup)

describe('App routes', () => {
  it('mounts every enabled report on its own path and offers the menu', () => {
    renderAt('/sharing')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sharing report')
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('does not mount a report whose flag is off, and shows no menu for a single report', () => {
    renderAt('/sharing', ['flag.storage'])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Storage report')
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
  })

  it('explains an empty feature set instead of rendering nothing', () => {
    renderAt('/', [])
    expect(screen.getByRole('alert')).toHaveTextContent(/no report is enabled/i)
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
  })

  it('serves the default report at the root itself, without redirecting', () => {
    renderAt('/?features=flag.storage&scenario=concealed')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Storage report')
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/?features=flag.storage&scenario=concealed',
    )
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('POP')
  })

  it('sends an unknown path home, replacing the history entry and keeping the query string', () => {
    renderAt('/nowhere?scenario=concealed')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Storage report')
    expect(screen.getByTestId('location')).toHaveTextContent('/?scenario=concealed')
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE')
  })

  it('keeps an enabled report on its own path', () => {
    renderAt('/sharing')
    expect(screen.getByTestId('location')).toHaveTextContent('/sharing')
  })
})
