import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { render } from '@/test/render'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SettingsProvider } from '@/app/SettingsProvider'
import { ApiError } from '@/clients/apiError'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type DataSource, type MockScenario } from '@/data/fixtures'
import { OneDriveUsage } from './OneDriveUsage'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderReport(scenario: MockScenario = 'healthy', overrides: Partial<DataSource> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ds = { ...createMockDataSource(scenario), ...overrides }
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

describe('OneDriveUsage', () => {
  it('shows the skeleton first, then the four OneDrive cards from the model', async () => {
    renderReport()
    expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })).toBeInTheDocument()
    expect(card('OneDrive storage')).toHaveTextContent('2.9 TB')
    expect(card('OneDrives')).toHaveTextContent('398')
    expect(card('Drives near capacity')).toHaveTextContent('2')
    expect(card('Drives near capacity')).toHaveTextContent(/90% or more/)
    expect(card('Deleted but still billing')).toHaveTextContent(/deleted drives/)
    expect(card('Over licensed storage')).toHaveTextContent('0')
    expect(card('Over licensed storage')).toHaveTextContent('Every drive fits the 1 TB its licence includes')
  })

  it('lists the accounts holding more than their licensed OneDrive storage, with the excess', async () => {
    renderReport('over-entitlement')
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(card('Over licensed storage')).toHaveTextContent('4')
    expect(card('Over licensed storage')).toHaveTextContent(
      '1.1 TB beyond the 1 TB each licence includes',
    )
    const table = screen.getByRole('table', { name: 'OneDrives over licensed storage' })
    expect(within(table).getByRole('columnheader', { name: 'Over licence by' })).toBeInTheDocument()
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('User 350')
    expect(rows[0]).toHaveTextContent('1.4 TB')
    expect(rows[0]).toHaveTextContent('426 GB')
    expect(rows[3]).toHaveTextContent('User 50')
    expect(rows[3]).toHaveTextContent('126 GB')
  })

  it('says no account is over its licence rather than showing an empty table', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.queryByRole('table', { name: 'OneDrives over licensed storage' })).not.toBeInTheDocument()
    expect(
      screen.getByText('No OneDrive holds more than the 1 TB a user licence includes'),
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
      screen.getByText('Accounts holding more than the 5 GB of OneDrive storage a user licence includes'),
    ).toBeInTheDocument()
    expect(card('Over licensed storage')).toHaveTextContent(/^23Over licensed storage/)
    expect(
      within(screen.getByRole('table', { name: 'OneDrives over licensed storage' })).getAllByRole('row'),
    ).toHaveLength(24)
  })

  it('lists the top drives and a per-drive capacity column, headed Drive not Site', async () => {
    renderReport()
    await screen.findByRole('heading', { name: 'OneDrive Usage', level: 1 })
    expect(screen.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'OneDrives' })
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Drive' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /capacity used/i })).toBeInTheDocument()
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
      screen.getByText('Every personal drive in the usage report, with how much of its own allocation it uses'),
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
    expect(screen.queryByText(/appear as hashes/i)).not.toBeInTheDocument()
    unmount()

    renderReport('concealed')
    expect(await screen.findByText(/appear as hashes/i)).toBeInTheDocument()
  })

  it('shows the same access failure screens as the storage report', async () => {
    renderReport('healthy', { getDrives: () => Promise.reject(new ApiError(403, 'Forbidden')) })
    expect(await screen.findByRole('alert')).toHaveTextContent(/reports reader/i)
  })
})
