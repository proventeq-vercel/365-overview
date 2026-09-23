import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
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

function renderShell(path = '/', reports: ReportDefinition[] = TWO_REPORTS, menuEnabled = true) {
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
    <AppShell reports={reports} menuEnabled={menuEnabled}>
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
    </AppShell>,
    { wrapper: Wrapper },
  )
}

afterEach(cleanup)

function viewport(pushesContent: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: pushesContent,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const menuPanel = () => screen.getByRole('navigation', { name: 'Reports' }).parentElement

describe('AppShell', () => {
  beforeEach(() => viewport(true))

  it('has no menu button and no menu at all when a single report is enabled', () => {
    renderShell('/', [TWO_REPORTS[0]])
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('has no menu button and no menu when two reports are enabled but the menu flag is off', () => {
    renderShell('/', TWO_REPORTS, false)
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('mounts the menu closed and inert until the hamburger is pressed', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(menuPanel()).toHaveAttribute('data-state', 'closed')
    expect(menuPanel()).toHaveAttribute('inert')
  })

  it('opens the side menu, lists every registered report and marks the current one', async () => {
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(menuPanel()).toHaveAttribute('data-state', 'open')
    expect(menuPanel()).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Storage Optimisation', 'OneDrive Usage'])
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Storage Optimisation')
  })

  it('treats the root path as the default report, not as no report', async () => {
    const user = userEvent.setup()
    renderShell('/sharing')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('OneDrive Usage')
  })

  it('navigates from a menu link and keeps the menu open where it pushes the content', async () => {
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('link', { name: 'OneDrive Usage' }))

    expect(screen.getByRole('status')).toHaveTextContent('/sharing')
    expect(menuPanel()).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('OneDrive Usage')
  })

  it('closes after navigating where it overlays the content', async () => {
    viewport(false)
    const user = userEvent.setup()
    renderShell('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('link', { name: 'OneDrive Usage' }))

    expect(screen.getByRole('status')).toHaveTextContent('/sharing')
    expect(menuPanel()).toHaveAttribute('data-state', 'closed')
  })

  it('closes on Escape and on the same header button', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(menuPanel()).toHaveAttribute('data-state', 'open')

    await user.keyboard('{Escape}')
    expect(menuPanel()).toHaveAttribute('data-state', 'closed')

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(menuPanel()).toHaveAttribute('data-state', 'closed')
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })
})
