import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import App from './App'

vi.mock('@/features/registry', async () => {
  const { HardDrive, Users } = await import('lucide-react')
  const REPORTS = [
    { id: 'storage', path: '/storage', title: 'Storage', icon: HardDrive, Component: () => <h1>Storage report</h1> },
    { id: 'sharing', path: '/sharing', title: 'Sharing', icon: Users, Component: () => <h1>Sharing report</h1> },
  ]
  return { REPORTS, DEFAULT_REPORT: REPORTS[0] }
})

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<App />, { wrapper: Wrapper })
}

afterEach(cleanup)

describe('App routes', () => {
  it('mounts every registered report on its own path', () => {
    renderAt('/sharing')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sharing report')
  })

  it('falls back to the default report for the root and unknown paths', () => {
    const { unmount } = renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Storage report')
    unmount()

    renderAt('/nowhere')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Storage report')
  })
})
