import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type DataSource } from '@/data/fixtures'
import { Header } from './Header'
import { SettingsProvider } from './SettingsProvider'

function renderHeader(overrides: Partial<DataSource> = {}, onOpenMenu?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ds = { ...createMockDataSource('healthy'), ...overrides }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>
          <SettingsProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<Header onOpenMenu={onOpenMenu} />, { wrapper: Wrapper })
}

afterEach(cleanup)

describe('Header', () => {
  it('shows a placeholder while the tenant loads, then the tenant name', async () => {
    renderHeader()
    expect(screen.getByLabelText('Loading tenant')).toBeInTheDocument()
    expect(await screen.findByText('Contoso Ltd')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading tenant')).not.toBeInTheDocument()
  })

  it('falls back to a neutral label when the organisation cannot be read', async () => {
    renderHeader({ getOrg: () => Promise.reject(new Error('nope')) })
    expect(await screen.findByText('Your tenant')).toBeInTheDocument()
  })

  it('carries the logo, refresh and settings controls and no breadcrumb', async () => {
    renderHeader()
    await screen.findByText('Contoso Ltd')
    expect(screen.getByRole('img', { name: 'Proventeq 365' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
  })

  it('offers the menu button only when the shell provides a menu', async () => {
    const onOpenMenu = vi.fn()
    const user = userEvent.setup()
    renderHeader({}, onOpenMenu)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(onOpenMenu).toHaveBeenCalledTimes(1)
  })

  it('disables refresh while data is being fetched and re-enables it afterwards', async () => {
    let release = () => {}
    const org = createMockDataSource('healthy').getOrg
    const user = userEvent.setup()
    renderHeader({
      getOrg: () =>
        new Promise((resolve) => {
          release = () => {
            void org().then(resolve)
          }
        }),
    })
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled()
    release()
    await screen.findByText('Contoso Ltd')
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled())
    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled())
  })
})
