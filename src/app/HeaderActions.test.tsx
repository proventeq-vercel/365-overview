import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import { HeaderActions } from './HeaderActions'
import { SettingsProvider } from './SettingsProvider'

const msal = vi.hoisted(() => ({
  accounts: [] as { name?: string; username: string }[],
  active: null as { name?: string; username: string } | null,
  logoutRedirect: vi.fn(),
  loginRedirect: vi.fn(),
}))
const envState = vi.hoisted(() => ({ useMock: false }))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      logoutRedirect: msal.logoutRedirect,
      loginRedirect: msal.loginRedirect,
      getActiveAccount: () => msal.active,
    },
    accounts: msal.accounts,
  }),
}))
vi.mock('@/config/env', () => ({
  env: {
    get useMock() {
      return envState.useMock
    },
    get usesMsal() {
      return !envState.useMock
    },
    mockScenario: 'healthy',
    features: new Set(),
  },
}))

function renderActions() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <SettingsProvider>{children}</SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<HeaderActions />, { wrapper: Wrapper })
}

async function openOptions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Options' }))
  return screen.findByRole('menu', { name: 'Options' })
}

beforeEach(() => {
  vi.clearAllMocks()
  msal.accounts = [{ name: 'Gov360 Automation', username: 'gov360@example.com' }]
  msal.active = null
  envState.useMock = false
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('HeaderActions', () => {
  it('is a single icon button until opened', () => {
    renderActions()
    const button = screen.getByRole('button', { name: 'Options' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button.querySelector('svg')).not.toBeNull()
    expect(button).not.toHaveTextContent('Options')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('lists every action with an icon and a description', async () => {
    const user = userEvent.setup()
    renderActions()
    const menu = await openOptions(user)
    const items = screen.getAllByRole('menuitem')
    expect(items.map((item) => item.querySelector('span > span')?.textContent)).toEqual([
      'Refresh data',
      'Report settings',
      'Switch account',
      'Sign out',
    ])
    for (const item of items) expect(item.querySelector('svg')).not.toBeNull()
    expect(menu).toHaveTextContent('Reload the report from Microsoft Graph')
    expect(menu).toHaveTextContent('Currency, cost per GB and the SharePoint entitlement')
    expect(menu).toHaveTextContent('Sign in with a different Microsoft account')
    expect(menu).toHaveTextContent('End this session')
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('offers no account actions on fixture data, where nobody is signed in', async () => {
    envState.useMock = true
    const user = userEvent.setup()
    renderActions()
    await openOptions(user)
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    expect(screen.queryByRole('menuitem', { name: /sign out/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('opens the report settings dialog from its item and closes the menu', async () => {
    const user = userEvent.setup()
    renderActions()
    await openOptions(user)
    await user.click(screen.getByRole('menuitem', { name: /report settings/i }))
    expect(await screen.findByRole('dialog', { name: 'Report settings' })).toBeVisible()
    expect(screen.getByLabelText('SharePoint entitlement')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('switches account by forcing the account picker on the next sign-in', async () => {
    const user = userEvent.setup()
    renderActions()
    await openOptions(user)
    await user.click(screen.getByRole('menuitem', { name: /switch account/i }))
    expect(msal.loginRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'select_account' }),
    )
    expect(msal.logoutRedirect).not.toHaveBeenCalled()
  })

  it('signs out through MSAL', async () => {
    const user = userEvent.setup()
    renderActions()
    await openOptions(user)
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(msal.logoutRedirect).toHaveBeenCalledTimes(1)
    expect(msal.logoutRedirect).toHaveBeenCalledWith({ account: msal.accounts[0] })
    expect(msal.loginRedirect).not.toHaveBeenCalled()
  })

  it('signs out the active account when the cache holds more than one', async () => {
    const user = userEvent.setup()
    msal.accounts = [
      { name: 'Gov360 Automation', username: 'gov360@example.com' },
      { name: 'Adele Vance', username: 'adele@example.com' },
    ]
    msal.active = msal.accounts[1]
    renderActions()
    await openOptions(user)
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(msal.logoutRedirect).toHaveBeenCalledWith({ account: msal.accounts[1] })
  })
})
