import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type DataSource, type MockScenario } from '@/data/fixtures'
import { ApiError } from '@/clients/apiError'
import App from '@/App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderApp(scenario: MockScenario = 'healthy', overrides: Partial<DataSource> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const source = createMockDataSource(scenario)
  const ds = { ...source, ...overrides, getSites: vi.fn(overrides.getSites ?? source.getSites) }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>
          <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return { ...render(<App />, { wrapper: Wrapper }), ds }
}

const reportLoaded = () => screen.findByRole('heading', { name: /main offenders/i })
async function chooseOption(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name: 'Options' }))
  await user.click(await screen.findByRole('menuitem', { name }))
}
const costCard = () =>
  screen.getByText('Cost of doing nothing').closest('[data-slot="stat-card"]') as HTMLElement

describe('Storage Optimisation app', () => {
  it('renders the header with the tenant name and the report sections', async () => {
    renderApp()
    await reportLoaded()
    expect(screen.getByRole('banner')).toHaveTextContent('Contoso Ltd')
    expect(screen.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeInTheDocument()
    const cards = screen.getAllByText(/./, { selector: '[data-slot="stat-card"] > p:nth-child(2)' })
    expect(cards.map((card) => card.textContent)).toEqual([
      'Storage used',
      'Remaining',
      'Cost of doing nothing',
      'Forecast exhaustion',
    ])
    expect(screen.getByRole('heading', { name: /current storage distribution/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /future state & growth impact/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top SharePoint sites by storage' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Sites and drives' })).toBeInTheDocument()
  })

  it('has no breadcrumb, no menu button and no footer when the menu flag is off', async () => {
    renderApp()
    await reportLoaded()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText(/full discovery/i)).not.toBeInTheDocument()
  })

  it('shows the report skeleton before the data arrives, never a zero-filled report', () => {
    renderApp()
    expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
    expect(screen.queryByText('0 B')).not.toBeInTheDocument()
  })

  it('keeps the estimated-entitlement caveat inside the growth callout, not a banner', async () => {
    renderApp()
    await reportLoaded()
    const statuses = screen.getAllByRole('status')
    expect(statuses).toHaveLength(1)
    expect(statuses[0]).toHaveTextContent(/estimated from licence counts/i)
    expect(screen.queryByRole('button', { name: /enter the real figure/i })).not.toBeInTheDocument()
  })

  it('explains concealed names only on a tenant that conceals them', async () => {
    const { unmount } = renderApp()
    await reportLoaded()
    expect(screen.queryByText(/appear as hashes/i)).not.toBeInTheDocument()
    unmount()

    renderApp('concealed')
    expect(await screen.findByText(/appear as hashes/i)).toBeInTheDocument()
    expect(screen.getByText(/storage figures are unaffected/i)).toBeInTheDocument()
  })

  it('refuses a forecast on the short-history tenant', async () => {
    renderApp('short-history')
    expect((await screen.findAllByText(/not an all-clear/i)).length).toBeGreaterThan(0)
  })

  it('recalculates against an admin override and clears the estimate caveat', async () => {
    const user = userEvent.setup()
    renderApp()
    await reportLoaded()

    await chooseOption(user, /report settings/i)
    await user.type(screen.getByLabelText('SharePoint entitlement'), '40')

    await waitFor(() =>
      expect(screen.queryByText(/estimated from licence counts/i)).not.toBeInTheDocument(),
    )
    expect(JSON.parse(localStorage.getItem('m365-storage-settings')!)).toMatchObject({
      entitlementOverrideBytes: 40 * 1024 * 1_073_741_824,
    })
  })

  it('recalculates a changed rate without re-issuing the Graph calls', async () => {
    const user = userEvent.setup()
    const { ds } = renderApp()
    await reportLoaded()
    expect(ds.getSites).toHaveBeenCalledTimes(1)

    await chooseOption(user, /report settings/i)
    const rate = screen.getByLabelText('Cost per GB per month')
    await user.clear(rate)
    await user.type(rate, '0.5')

    expect(costCard()).toHaveTextContent('£0.50/GB per month')
    expect(ds.getSites).toHaveBeenCalledTimes(1)
  })

  it('re-prices the report when a currency is picked from the list', async () => {
    const user = userEvent.setup()
    renderApp()
    await reportLoaded()
    expect(costCard()).toHaveTextContent('£')

    await chooseOption(user, /report settings/i)
    await user.click(screen.getByRole('combobox', { name: 'Currency' }))
    await user.click(await screen.findByRole('option', { name: /EUR/ }))

    expect(costCard()).toHaveTextContent('€')
    expect(JSON.parse(localStorage.getItem('m365-storage-settings')!)).toMatchObject({
      currency: 'EUR',
    })
  })

  it('refetches every query from the refresh option', async () => {
    const user = userEvent.setup()
    const { ds } = renderApp()
    await reportLoaded()
    expect(ds.getSites).toHaveBeenCalledTimes(1)

    await chooseOption(user, /refresh data/i)
    await waitFor(() => expect(ds.getSites).toHaveBeenCalledTimes(2))
  })

  it('routes a consent failure to the consent screen inside the shell', async () => {
    renderApp('healthy', {
      getSites: () => Promise.reject(new ApiError(403, 'AADSTS65001: The user has not consented')),
    })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/global administrator/i)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
  })

  it('offers a retry on an unexplained failure and recovers when it succeeds', async () => {
    const user = userEvent.setup()
    const healthy = createMockDataSource('healthy')
    let attempts = 0
    renderApp('healthy', {
      getSites: () => {
        attempts += 1
        return attempts === 1 ? Promise.reject(new ApiError(500, 'Server exploded')) : healthy.getSites()
      },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await reportLoaded()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
