import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SettingsProvider } from '@/app/SettingsProvider'
import { ApiError } from '@/clients/apiError'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type DataSource, type MockScenario } from '@/data/fixtures'
import type * as EnvModule from '@/config/env'
import { FeatureFlags } from '@/config/featureFlags'
import { OneDriveUsage } from './OneDriveUsage'

vi.mock('@/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>()
  return {
    ...actual,
    env: {
      ...actual.env,
      features: new Set([...actual.env.features, FeatureFlags.OptimizationStorageReportOneDrive]),
    },
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderReport(scenario: MockScenario = 'healthy', overrides: Partial<DataSource> = {}, hideNames = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ds = { ...createMockDataSource(scenario, { hideNames }), ...overrides }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>
          <SettingsProvider>{children}</SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<OneDriveUsage />, { wrapper: Wrapper })
}

const card = (label: string) =>
  screen.getByText(label, { selector: '[data-slot="stat-card"] p' }).closest('[data-slot="stat-card"]') as HTMLElement

const FULL_REPORT_RENDER = { timeout: 15_000 }

describe('OneDriveUsage', FULL_REPORT_RENDER, () => {
  it('shows the skeleton first, then the five OneDrive cards from the model', async () => {
    renderReport()
    expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeInTheDocument()
    expect(card('OneDrive storage')).toHaveTextContent('2.9 TB')
    expect(card('OneDrives')).toHaveTextContent('398')
    expect(card('Drives near their quota')).toHaveTextContent('2')
    expect(card('Drives near their quota')).toHaveTextContent(/90% or more/)
    expect(card('Deleted but still billing')).toHaveTextContent(/deleted drives/)
    expect(card('Over licensed storage')).toHaveTextContent(
      /^0Over licensed storageEvery drive fits within 5 TB per user$/,
    )
  })

  it('lists the accounts holding more than their licensed OneDrive storage, with the excess', async () => {
    renderReport('onedrive-over-licence')
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('Over licensed storage')).toHaveTextContent(
      /^4Over licensed storage1\.1 TB beyond 5 TB per user$/,
    )
    const table = screen.getByRole('table', { name: 'OneDrives over licensed storage' })
    expect(within(table).getByRole('columnheader', { name: 'Over licence by' })).toBeInTheDocument()
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('User 350')
    expect(rows[0]).toHaveTextContent('5.4 TB')
    expect(rows[0]).toHaveTextContent('430 GB')
    expect(rows[3]).toHaveTextContent('User 50')
    expect(rows[3]).toHaveTextContent('130 GB')
    expect(screen.getByText(/^Measured against the most generous plan the tenant holds/)).toBeInTheDocument()
  })

  it('says no account is over its licence rather than showing an empty table', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.queryByRole('table', { name: 'OneDrives over licensed storage' })).not.toBeInTheDocument()
    expect(
      screen.getByText('No OneDrive holds more than 5 TB'),
    ).toBeInTheDocument()
  })

  it('measures against the per-user storage saved in the report settings', async () => {
    localStorage.setItem(
      'm365-storage-settings',
      JSON.stringify({ oneDriveEntitlementOverrideBytes: 5 * 1_073_741_824 }),
    )
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(
      screen.getByText(
        'Accounts holding more than the 5 GB of OneDrive storage per user set in Report settings',
      ),
    ).toBeInTheDocument()
    expect(card('Over licensed storage')).toHaveTextContent(/^23Over licensed storage/)
    expect(
      within(screen.getByRole('table', { name: 'OneDrives over licensed storage' })).getAllByRole('row'),
    ).toHaveLength(24)
    expect(screen.getByText(/^Measured against the figure set in Options, Report settings\./)).toBeInTheDocument()
    expect(screen.queryByText(/^Measured against the most generous plan/)).not.toBeInTheDocument()
  })

  it('gives every section its own help, so no two help buttons share a name', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    const names = screen.getAllByRole('button', { name: /^About / }).map((button) => button.getAttribute('aria-label'))
    expect(names).toContain('About Top OneDrives by storage')
    expect(names).toContain('About All OneDrives')
    expect(new Set(names).size).toBe(names.length)
  })

  it('lists the top drives and a per-drive quota column, headed Drive not Site', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'OneDrives' })
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Drive' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /quota used/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Site' })).not.toBeInTheDocument()
  })

  it('says how many deleted-but-retained drives the table includes, so it can exceed the active count', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('OneDrives')).toHaveTextContent('398')
    expect(screen.getByText('400 of 400')).toBeInTheDocument()
    expect(
      screen.getByText(/including 2 deleted drives still under retention/),
    ).toBeInTheDocument()
  })

  it('adds nothing to the subtitle when no drive is under retention', async () => {
    const live = createMockDataSource('healthy')
    renderReport('healthy', {
      getDrives: async () => (await live.getDrives()).filter((drive) => !drive.isDeleted),
    })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(
      screen.getByText('Every personal drive in the usage report, with how much of its own storage quota it uses'),
    ).toBeInTheDocument()
  })

  it('never lists a SharePoint site among the drives', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.queryByRole('link', { name: /^\/sites\// })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^\/personal\// }).length).toBeGreaterThan(0)
  })

  it('explains concealed names only on a tenant that conceals them', async () => {
    const { unmount } = renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.queryByText(/identities below are blurred/i)).not.toBeInTheDocument()
    unmount()

    renderReport('concealed')
    expect(await screen.findByText(/identities below are blurred/i)).toBeInTheDocument()
  })

  it('measures against the commonest OneDrive limit, and says so, when the licences cannot be read', async () => {
    renderReport('onedrive-over-licence', { getLicenses: async () => null })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('Over the usual OneDrive limit')).toHaveTextContent(
      /^4Over the usual OneDrive limit17\.1 TB beyond 1 TB, the commonest OneDrive limit$/,
    )
    const table = screen.getByRole('table', { name: 'OneDrives over the usual limit' })
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    expect(within(table).getByRole('columnheader', { name: /Over the limit by/ })).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /Over licence by/ })).not.toBeInTheDocument()
    expect(screen.getByText('Accounts holding more than 1 TB, the commonest storage limit: 394 of 398 live OneDrives report it')).toBeInTheDocument()
    expect(screen.getByText(/^The report has no access to the tenant's licences \(the Organization\.Read\.All permission/)).toBeInTheDocument()
    expect(screen.queryByText(/unknown|unavailable/i)).not.toBeInTheDocument()
  })

  it('does not promise an estimate to go back to when an override is set and the licences cannot be read', async () => {
    localStorage.setItem(
      'm365-storage-settings',
      JSON.stringify({ oneDriveEntitlementOverrideBytes: 500 * 1_073_741_824 }),
    )
    renderReport('onedrive-over-licence', { getLicenses: async () => null })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getByText(/clearing it measures against the commonest OneDrive limit\.$/)).toBeInTheDocument()
    expect(screen.queryByText(/go back to the estimate from licences/)).not.toBeInTheDocument()
  })

  it('says no licence has a known allowance, not that licences were unreadable, on an education-only tenant', async () => {
    renderReport('onedrive-over-licence', {
      getLicenses: async () => [
        {
          skuId: 'a3',
          skuPartNumber: 'M365EDU_A3_FACULTY',
          consumed: 50,
          enabled: 60,
          available: 10,
          servicePlans: ['SHAREPOINTENTERPRISE_EDU'],
        },
      ],
    })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('Over the usual OneDrive limit')).toHaveTextContent(/^4Over the usual OneDrive limit/)
    expect(screen.getByText(/education allowances vary by agreement; developer and add-on plans are not sized here\), so this measures against the commonest storage limit among the OneDrives/)).toBeInTheDocument()
    expect(screen.queryByText(/no access to the tenant's licences/)).not.toBeInTheDocument()
  })

  it('says clearing a set figure goes back to the estimate from licences when the licences give one', async () => {
    localStorage.setItem('m365-storage-settings', JSON.stringify({ oneDriveEntitlementOverrideBytes: 500 * 1_073_741_824 }))
    renderReport('onedrive-over-licence')
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getByText(/Clear it there to go back to the estimate from licences\.$/)).toBeInTheDocument()
  })

  it('says clearing a set figure leaves the section out when neither licences nor OneDrives give a limit', async () => {
    localStorage.setItem('m365-storage-settings', JSON.stringify({ oneDriveEntitlementOverrideBytes: 500 * 1_073_741_824 }))
    const drives = (await createMockDataSource().getDrives()).map((drive) => ({ ...drive, allocatedBytes: undefined }))
    renderReport('healthy', { getLicenses: async () => null, getDrives: async () => drives })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getByText(/so clearing it leaves this section out\.$/)).toBeInTheDocument()
  })

  it('leaves the over-licence card and section out, never Unknown, when no licence, setting or drive gives a limit', async () => {
    const drives = (await createMockDataSource().getDrives()).map((drive) => ({ ...drive, allocatedBytes: undefined }))
    renderReport('healthy', { getLicenses: async () => null, getDrives: async () => drives })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.queryByRole('heading', { name: /^OneDrives over/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Over /, { selector: '[data-slot="stat-card"] p' })).not.toBeInTheDocument()
    expect(screen.queryByText(/unknown|unavailable/i)).not.toBeInTheDocument()
  })

  it('counts the OneDrives quiet for 93 days in place of the unlicensed ones when the active-user report does not come back', async () => {
    renderReport('healthy', { getOneDriveLicences: async () => null })
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('No activity for over 93 days')).toHaveTextContent(/live OneDrives have had no activity since 29 May 2026, though they were active within the last 3 years \(longer quiet ones count as inactive\)\./)
    expect(card('No activity for over 93 days')).toHaveTextContent(/Shown in place of the owners without a licence/)
    expect(screen.queryByText('Owner unlicensed')).not.toBeInTheDocument()
    expect(screen.queryByText(/unknown|unavailable/i)).not.toBeInTheDocument()
  })

  it('explains hidden names before the first table that shows them', async () => {
    renderReport('concealed')
    const banner = await screen.findByText(/identities below are blurred/i)
    const firstNames = screen.getByRole('heading', { name: 'Top OneDrives by storage' })
    expect(banner.compareDocumentPosition(firstNames) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['hidden', 'healthy', true, 'Name hidden in this report'],
    ['concealed', 'concealed', false, 'Name concealed by Microsoft'],
  ] as const)('blurs every drive and owner name when names are %s, with one note', async (_, scenario, hideNames, title) => {
    const user = userEvent.setup()
    renderReport(scenario, {}, hideNames)
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getAllByRole('button', { name: 'Hidden name' }).length).toBeGreaterThan(0)
    const html = document.body.innerHTML
    expect([/User \d/, /@contoso\.com/, /sharepoint\.com\//, /\b(?=[0-9a-f]*[a-f])[0-9a-f]{16}\b/, /[0-9A-F]{32}/].filter((p) => p.test(html))).toEqual([])
    expect(screen.getAllByRole('status').filter((status) => /names/i.test(status.textContent ?? ''))).toHaveLength(1)
    await user.click(screen.getAllByRole('button', { name: 'Hidden name' })[0])
    expect(await screen.findByRole('dialog')).toHaveTextContent(title)
  })

  it('shows the OneDrive storage from its trend and names the report that did not come back', async () => {
    renderReport('no-onedrive-report')
    expect(await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Microsoft's OneDrive usage report did not come back this time, so the figures drawn from it are left out of this page. Refresh data asks for it again.",
    )
    expect(card('OneDrive storage')).toHaveTextContent('Tenant-wide, as reported by Microsoft 365')
    expect(screen.queryByText('OneDrives', { selector: '[data-slot="stat-card"] p' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'All OneDrives' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^Inactive, deleted and/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/unknown|unavailable/i)).not.toBeInTheDocument()
  })

  it('shows no OneDrive figure at all when neither OneDrive report came back', async () => {
    const down = () => Promise.reject(new ApiError(503, 'Service unavailable'))
    renderReport('healthy', { getDrives: down, getOneDriveTrend: down })
    expect(await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Microsoft's OneDrive usage report and OneDrive storage trend did not come back this time, so the figures drawn from them are left out of this page. Refresh data asks for them again.",
    )
    expect(document.querySelector('[data-slot="stat-card"]')).toBeNull()
  })

  it('says the OneDrive page still shows the earlier load when a reload loses a report', async () => {
    const user = userEvent.setup()
    const source = createMockDataSource('no-trends')
    let reloaded = false
    renderReport('no-trends', {
      getDrives: () => (reloaded ? Promise.reject(new ApiError(500, 'Server exploded')) : source.getDrives()),
    })
    expect(await screen.findByRole('heading', { name: 'All OneDrives' })).toBeInTheDocument()
    reloaded = true
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Refresh data' }))
    expect(
      await screen.findByText(
        "The last reload of Microsoft's reports did not bring back the OneDrive usage report, so this page still shows the earlier load. In that earlier load, Microsoft's OneDrive storage trend did not come back, so the figures drawn from it are left out of this page.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'All OneDrives' })).toBeInTheDocument()
  })

  it('names no SharePoint report when a reload lost only SharePoint figures', async () => {
    const user = userEvent.setup()
    const source = createMockDataSource('no-trends')
    let reloaded = false
    renderReport('no-trends', {
      getSites: () => (reloaded ? Promise.reject(new ApiError(500, 'Server exploded')) : source.getSites()),
    })
    expect(await screen.findByRole('heading', { name: 'All OneDrives' })).toBeInTheDocument()
    reloaded = true
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Refresh data' }))
    const note = await screen.findByText(/^The last reload of Microsoft's reports did not bring every report back/)
    expect(note).not.toHaveTextContent(/SharePoint/)
  })

  it('names only the OneDrive reports that did not come back', async () => {
    renderReport('no-site-report')
    expect(await screen.findByRole('heading', { name: 'All OneDrives' })).toBeInTheDocument()
    expect(screen.queryByText(/did not come back this time/)).not.toBeInTheDocument()
  })

  it('says the OneDrive storage is the usage report total when its trend did not come back', async () => {
    renderReport('no-trends')
    expect(await screen.findByRole('heading', { name: 'All OneDrives' })).toBeInTheDocument()
    expect(card('OneDrive storage')).toHaveTextContent(
      "The total of Microsoft's OneDrive usage report, which lists every OneDrive: its OneDrive storage trend did not come back this time.",
    )
  })

  it('shows the same access failure screens as the storage report', async () => {
    renderReport('healthy', { getDrives: () => Promise.reject(new ApiError(403, 'Forbidden')) })
    expect(await screen.findByRole('alert')).toHaveTextContent(/reports reader/i)
  })
})
