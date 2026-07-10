import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// jsdom reports 0 for layout boxes; @tanstack/react-virtual measures its scroll
// container via offsetWidth/offsetHeight and renders no rows when they are 0.
// Give elements a non-zero box so the virtualizer produces a visible window.
const heightDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const widthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 480 })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 800 })
})
afterAll(() => {
  if (heightDesc) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', heightDesc)
  if (widthDesc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', widthDesc)
})
import { DataSourceContext } from '../../data/useDataSource'
import { createMockDataSource } from '../../data/fixtures'
import { SharePoint } from './index'

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const mockDs = createMockDataSource()
  return render(
    <QueryClientProvider client={queryClient}>
      <DataSourceContext value={mockDs}>{ui}</DataSourceContext>
    </QueryClientProvider>,
  )
}

describe('SharePoint section', () => {
  it('renders the fixture total sites KPI and a virtualized site table', async () => {
    renderWithProviders(<SharePoint />)

    // Total sites KPI = 2,504 from fixtures (4 named + 2500 generated).
    expect(await screen.findByText('Total sites')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByText('Total sites').closest('[data-slot="card"]'),
      ).toHaveTextContent('2,504'),
    )

    // The table renders rows (virtualized window is non-empty)...
    expect(screen.getByRole('table', { name: 'Sites' })).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
    // ...and is WINDOWED: only a small visible slice is in the DOM, never all
    // 2,504 sites. Guards against a regression that drops the virtualizer.
    expect(rows.length).toBeLessThan(100)
  })

  it('surfaces a named site when searched for', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SharePoint />)

    const search = await screen.findByRole('searchbox', { name: 'Search sites' })
    await user.type(search, 'marketing')

    await waitFor(() =>
      expect(
        screen.getByText('https://contoso.sharepoint.com/sites/marketing'),
      ).toBeInTheDocument(),
    )
  })
})
