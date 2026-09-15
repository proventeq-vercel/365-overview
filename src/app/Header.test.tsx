import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type DataSource } from '@/data/fixtures'
import { Header } from './Header'
import { SettingsProvider } from './SettingsProvider'

function renderHeader(
  overrides: Partial<DataSource> = {},
  onToggleMenu?: () => void,
  menuOpen = false,
) {
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
  return render(<Header menuOpen={onToggleMenu && menuOpen} onToggleMenu={onToggleMenu} />, {
    wrapper: Wrapper,
  })
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

  it('carries the proventeq365 logo, one options button and no breadcrumb', async () => {
    renderHeader()
    await screen.findByText('Contoso Ltd')
    const logo = screen.getByRole('img', { name: 'Proventeq 365' })
    expect(logo).toHaveClass('h-8')
    expect(logo.querySelectorAll('path')).toHaveLength(14)
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Options',
    ])
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('offers the menu toggle only when the shell provides a menu', async () => {
    const onToggleMenu = vi.fn()
    const user = userEvent.setup()
    renderHeader({}, onToggleMenu)
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'reports-menu')
    await user.click(toggle)
    expect(onToggleMenu).toHaveBeenCalledTimes(1)
  })

  it('labels the same button Close menu while the menu is open', () => {
    renderHeader({}, vi.fn(), true)
    const toggle = screen.getByRole('button', { name: 'Close menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
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
    const refreshItem = () => screen.getByRole('menuitem', { name: /refresh data/i })
    await user.click(screen.getByRole('button', { name: 'Options' }))
    await screen.findByRole('menu', { name: 'Options' })
    expect(refreshItem()).toHaveAttribute('aria-disabled', 'true')
    expect(refreshItem()).toHaveTextContent('Reloading from Microsoft Graph…')
    release()
    await screen.findByText('Contoso Ltd')
    await waitFor(() => expect(refreshItem()).not.toHaveAttribute('aria-disabled'))

    await user.click(refreshItem())
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Options' }))
    await screen.findByRole('menu', { name: 'Options' })
    expect(refreshItem()).toHaveAttribute('aria-disabled', 'true')
    release()
    await waitFor(() => expect(refreshItem()).not.toHaveAttribute('aria-disabled'))
  })
})
