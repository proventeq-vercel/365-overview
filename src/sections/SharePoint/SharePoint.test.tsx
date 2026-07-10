import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
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
  it('renders the fixture total sites KPI and a row per site', async () => {
    renderWithProviders(<SharePoint />)

    // Total sites KPI = 4 from fixtures.
    expect(await screen.findByText('Total sites')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByText('Total sites').closest('[data-slot="card"]'),
      ).toHaveTextContent('4'),
    )

    // One table row per fixture site (site URLs render in the table).
    expect(
      screen.getByText('https://contoso.sharepoint.com/sites/marketing'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://contoso.sharepoint.com/sites/engineering'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://contoso.sharepoint.com/sites/hr'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://contoso.sharepoint.com/sites/sales'),
    ).toBeInTheDocument()
  })
})
