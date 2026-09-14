import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import { AppShell } from './AppShell'
import { SettingsProvider } from './SettingsProvider'

import { HardDrive, Users } from 'lucide-react'
import type { ReportDefinition } from '@/features/registry'

const TWO_REPORTS: ReportDefinition[] = [
  {
    id: 'storage',
    path: '/storage',
    titleKey: 'reports.storageOptimisation.title',
    icon: HardDrive,
    requireFeature: 'optimization.storage.report.overview',
    Component: () => null,
  },
  {
    id: 'sharing',
    path: '/sharing',
    titleKey: 'reports.oneDriveUsage.title',
    icon: Users,
    requireFeature: 'optimization.storage.report.onedrive',
    Component: () => null,
  },
]

function Location() {
  return <output>{useLocation().pathname}</output>
}

function renderShell(path = '/', reports: ReportDefinition[] = TWO_REPORTS) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <SettingsProvider>
            <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
          </SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(
    <AppShell reports={reports}>
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
    </AppShell>,
    { wrapper: Wrapper },
  )
}

afterEach(cleanup)

describe('AppShell', () => {
  it('has no menu button and no menu at all when a single report is enabled', () => {
    renderShell('/', [TWO_REPORTS[0]])
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('keeps the menu closed and out of the tree until the hamburger is pressed', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('opens the floating menu, lists every registered report and marks the current one', async () => {
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const menu = await screen.findByRole('dialog', { name: 'Reports' })
    expect(menu).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Storage Optimisation', 'OneDrive Usage'])
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Storage Optimisation')
  })

  it('treats the root path as the default report, not as no report', async () => {
    const user = userEvent.setup()
    renderShell('/sharing')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await screen.findByRole('dialog', { name: 'Reports' })
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('OneDrive Usage')
  })

  it('navigates from a menu link and closes the menu', async () => {
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(await screen.findByRole('link', { name: 'OneDrive Usage' }))

    expect(screen.getByRole('status')).toHaveTextContent('/sharing')
    act(() => {
      fireEvent.transitionEnd(screen.getByRole('dialog', { name: 'Reports' }))
    })
    expect(screen.queryByRole('dialog', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('closes on Escape and on the close button', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reports' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus())

    await user.keyboard('{Escape}')
    expect(dialog.parentElement).toHaveAttribute('data-state', 'closed')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(dialog.parentElement).toHaveAttribute('data-state', 'closed')
  })
})
