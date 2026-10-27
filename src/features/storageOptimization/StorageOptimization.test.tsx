import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
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

function renderApp(scenario: MockScenario = 'healthy', overrides: Partial<DataSource> = {}, hideNames = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const source = createMockDataSource(scenario, { hideNames })
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
const statCard = (label: string) =>
  screen.getByText(label).closest('[data-slot="stat-card"]') as HTMLElement
const costCard = () => statCard('Cost of doing nothing, next 12 months')
const archiveCard = () => statCard('Inactive sites to archive')

const SETTINGS_ROUND_TRIP = { timeout: 15_000 }

describe('Storage Optimisation app', () => {
  it('renders the header with the tenant name and the report sections', async () => {
    renderApp()
    await reportLoaded()
    expect(screen.getByRole('banner')).toHaveTextContent('Contoso Ltd')
    expect(screen.getByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeInTheDocument()
    const cards = screen.getAllByText(/./, { selector: '[data-slot="stat-card"] > p:nth-child(2)' })
    expect(cards.map((card) => card.textContent)).toEqual([
      'Inactive sites to archive',
      'Cost of doing nothing, next 12 months',
      'Forecast exhaustion',
    ])
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Current storage distribution',
      'Future state & growth impact',
      'Main offenders',
    ])
    const firstSection = screen.getByRole('heading', { name: 'Current storage distribution' })
    expect(
      screen.getByRole('region', { name: 'Tenant capacity' }).compareDocumentPosition(firstSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Top SharePoint sites by storage' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Sites and drives' })).toBeInTheDocument()
    expect(screen.getByText('Live sites').nextElementSibling).toHaveTextContent(/^2,499$/)
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
    expect(screen.queryByText(/identities below are blurred/i)).not.toBeInTheDocument()
    unmount()

    renderApp('concealed')
    expect(await screen.findByText(/identities below are blurred/i)).toBeInTheDocument()
    expect(screen.getByText(/storage figures are unaffected/i)).toBeInTheDocument()
  })

  describe('masked names', () => {
    const REAL_NAMES = [
      'Marketing',
      'Engineering',
      'Human Resources',
      'Alice Marketing',
      'Bob Engineering',
      'B.E.',
      'sharepoint.com/',
      '@contoso.com',
      'Secret Finance',
    ]
    const REAL_NAME_PATTERNS = [/Team \d/, /Owner \d/, /User \d/, /\b(?=[0-9a-f]*[a-f])[0-9a-f]{16}\b/, /[0-9A-F]{32}/]
    const realNameSource = {
      getSiteDetails: vi.fn(async (ids: string[]) => {
        const found = new Map<string, { name: string; url: string }>()
        for (const id of ids) {
          found.set(id.toLowerCase(), { name: 'Secret Finance', url: 'https://contoso.sharepoint.com/sites/secret-finance' })
        }
        return found
      }),
      getSiteDirectory: async () =>
        new Map([['site-2', { name: 'Secret Finance', url: 'https://contoso.sharepoint.com/sites/secret-finance' }]]),
    }
    const leaks = () => {
      const html = document.body.innerHTML
      return [
        ...REAL_NAMES.filter((name) => html.includes(name)),
        ...REAL_NAME_PATTERNS.filter((pattern) => pattern.test(html)).map(String),
      ]
    }
    const nameNotes = () =>
      screen.getAllByRole('status').filter((status) => /names/i.test(status.textContent ?? ''))
    const explain = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getAllByRole('button', { name: 'Hidden name' })[0])
      return screen.findByRole('dialog')
    }

    it('blurs every name when hide names is on, with no real name in the page and one note', async () => {
      const user = userEvent.setup()
      renderApp('healthy', {}, true)
      await reportLoaded()
      expect(screen.getAllByRole('button', { name: 'Hidden name' }).length).toBeGreaterThan(0)
      expect(leaks()).toEqual([])
      expect(nameNotes()).toHaveLength(1)
      expect(nameNotes()[0]).toHaveTextContent('Site names and owners are hidden')
      expect(await explain(user)).toHaveTextContent('Name hidden in this report')
    })

    it('blurs every name of a concealed tenant the same way, and looks none up', async () => {
      const user = userEvent.setup()
      renderApp('concealed', realNameSource)
      await reportLoaded()
      expect(screen.getAllByRole('button', { name: 'Hidden name' }).length).toBeGreaterThan(0)
      expect(leaks()).toEqual([])
      expect(realNameSource.getSiteDetails).not.toHaveBeenCalled()
      expect(nameNotes()).toHaveLength(1)
      expect(nameNotes()[0]).toHaveTextContent('Your tenant conceals user and site names')
      expect(await explain(user)).toHaveTextContent('Name concealed by Microsoft')
    })

    it('still finds a row by its pseudonym while names are hidden', SETTINGS_ROUND_TRIP, async () => {
      const user = userEvent.setup()
      renderApp('healthy', {}, true)
      await reportLoaded()
      await user.type(screen.getByRole('searchbox'), 'f73c10f1')
      const table = screen.getByRole('table', { name: 'Sites and drives' })
      expect(await screen.findByText(/^1 of /)).toBeInTheDocument()
      expect(within(table).getAllByRole('row')).toHaveLength(2)
      expect(within(table).getByText('150 GB')).toBeInTheDocument()
    })
  })

  it('forecasts the short-history tenant from its daily storage', async () => {
    renderApp('short-history')
    expect((await screen.findAllByText(/Forecast from the last 31 days of storage/)).length).toBeGreaterThan(0)
  })

  it('recalculates against an admin override and clears the estimate caveat', SETTINGS_ROUND_TRIP, async () => {
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

  it('recalculates a changed rate without re-issuing the Graph calls', SETTINGS_ROUND_TRIP, async () => {
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

  it('re-prices the report when a currency is picked from the list', SETTINGS_ROUND_TRIP, async () => {
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

  it('recounts inactive sites for a changed inactivity window without re-issuing the Graph calls', SETTINGS_ROUND_TRIP, async () => {
    const user = userEvent.setup()
    const { ds } = renderApp()
    await reportLoaded()
    expect(archiveCard()).toHaveTextContent('no activity for 3 years (since August 2023)')

    await chooseOption(user, /report settings/i)
    await user.click(screen.getByRole('combobox', { name: 'Archive sites inactive for' }))
    await user.click(await screen.findByRole('option', { name: '5 years' }))

    expect(archiveCard()).toHaveTextContent('No site has gone 5 years without activity (since August 2021).')
    expect(ds.getSites).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem('m365-storage-settings')!)).toMatchObject({
      inactiveYears: 5,
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

  it('leaves out only the figures of the site usage report when it does not come back', async () => {
    renderApp('no-site-report')
    await reportLoaded()
    expect(screen.getByText(/^Microsoft's SharePoint site usage report did not come back this time/)).toBeInTheDocument()
    expect(screen.getByText(/Data as of 2026-08-31\./)).toBeInTheDocument()
    expect(screen.getByText('Where storage sits today, from the Microsoft reports that came back')).toBeInTheDocument()
    expect(screen.getByText('The OneDrives driving the most storage')).toBeInTheDocument()
    expect(screen.getByText('All OneDrives')).toBeInTheDocument()
    expect(screen.getByText('Every OneDrive in the OneDrive usage report, sortable and searchable')).toBeInTheDocument()
    expect(screen.queryByText('Inactive sites to archive')).not.toBeInTheDocument()
    expect(screen.getByText('Forecast exhaustion')).toBeInTheDocument()
    expect(screen.queryByText('Storage by site template')).not.toBeInTheDocument()
    expect(screen.queryByText('If inactive and deleted sites are cleaned up')).not.toBeInTheDocument()
    expect(screen.queryByText('Deleted but still billing')).not.toBeInTheDocument()
    expect(screen.queryByText('Top SharePoint sites by storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Forecast after clean-up')).not.toBeInTheDocument()
    expect(screen.queryByText('Live sites')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Grouped by site template/)).not.toBeInTheDocument()
    expect(screen.getByText('Drives near their quota')).toBeInTheDocument()
    expect(screen.getByText('Top OneDrives by storage')).toBeInTheDocument()
  })

  it('leaves out only the per-drive figures when the OneDrive usage report does not come back', async () => {
    renderApp('no-onedrive-report')
    await reportLoaded()
    expect(screen.getByText(/^Microsoft's OneDrive usage report did not come back this time/)).toBeInTheDocument()
    expect(screen.getByText('The sites driving the most storage')).toBeInTheDocument()
    expect(screen.getByText('All sites')).toBeInTheDocument()
    expect(screen.getByText('Every site in the SharePoint site usage report, sortable and searchable')).toBeInTheDocument()
    expect(screen.queryByText('Top OneDrives by storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Drives near their quota')).not.toBeInTheDocument()
    expect(screen.getByText('Live sites')).toBeInTheDocument()
    expect(screen.getByText('Live OneDrive storage')).toBeInTheDocument()
  })

  it('leaves OneDrive out as a whole, and gives no date it does not have, when only the OneDrive usage report came back', async () => {
    const down = () => Promise.reject(new ApiError(503, 'Service unavailable'))
    renderApp('healthy', { getSites: down, getReportRefreshDate: down, getSharePointTrend: down, getOneDriveTrend: down })
    await reportLoaded()
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument()
    expect(screen.getByText('Top OneDrives by storage')).toBeInTheDocument()

    cleanup()
    renderApp('healthy', { getDrives: down, getOneDriveTrend: down })
    await reportLoaded()
    expect(screen.queryByText('Live OneDrive storage')).not.toBeInTheDocument()
    expect(screen.getByText('Storage usage')).toBeInTheDocument()
    expect(screen.getByText(/OneDrive is a separate pool\. Hover or select/)).toBeInTheDocument()

    cleanup()
    renderApp('no-licences', { getDrives: down, getOneDriveTrend: down })
    await reportLoaded()
    expect(screen.getByText('Every SharePoint workload on one line. OneDrive is a separate pool. Hover or select a part for details.')).toBeInTheDocument()
  })

  it('lists no offenders and reads no daily report when neither usage report comes back', async () => {
    const down = () => Promise.reject(new ApiError(500, 'Server exploded'))
    const getSitesOn = vi.fn(async () => [])
    renderApp('healthy', { getSites: down, getReportRefreshDate: down, getDrives: down, getSitesOn })
    expect(await screen.findByRole('heading', { name: /Future state & growth impact/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
    expect(getSitesOn).not.toHaveBeenCalled()
  })

  it('says the clean-up forecast waits for the storage trend when the trend did not come back', async () => {
    renderApp('no-trends')
    await reportLoaded()
    expect(screen.getByText(/The forecast after clean-up returns when Refresh data brings the SharePoint storage trend back\.$/)).toBeInTheDocument()
  })

  it('leaves SharePoint out as a whole when neither of its reports comes back', async () => {
    renderApp('no-sharepoint-reports')
    await reportLoaded()
    expect(screen.getByText(/^Microsoft's SharePoint site usage report and SharePoint storage trend did not come back/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Tenant capacity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Future state & growth impact/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Storage usage')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "A separate pool: each user's OneDrive has its own allowance from their licence, so it does not use the SharePoint entitlement.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Live OneDrive storage')).toBeInTheDocument()
  })

  it('asks for the missing report again from the note', async () => {
    const user = userEvent.setup()
    const { ds } = renderApp('no-site-report')
    await reportLoaded()
    const reads = ds.getSites.mock.calls.length
    await user.click(within(screen.getByText(/did not come back this time/).closest('[role="status"]') as HTMLElement).getByRole('button', { name: 'Refresh data' }))
    await waitFor(() => expect(ds.getSites.mock.calls.length).toBeGreaterThan(reads))
  })

  it('offers a retry on an unexplained failure and recovers when it succeeds', async () => {
    const user = userEvent.setup()
    const healthy = createMockDataSource('healthy')
    let down = true
    const failing =
      <T,>(read: () => Promise<T>) =>
      () =>
        down ? Promise.reject(new ApiError(500, 'Server exploded')) : read()
    renderApp('healthy', {
      getSites: failing(healthy.getSites),
      getDrives: failing(healthy.getDrives),
      getSharePointTrend: failing(healthy.getSharePointTrend),
      getOneDriveTrend: failing(healthy.getOneDriveTrend),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')

    down = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await reportLoaded()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
