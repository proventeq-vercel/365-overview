import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '../../data/useDataSource'
import { createMockDataSource } from '../../data/fixtures'
import { Overview } from './index'

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const mockDs = createMockDataSource()
  return render(
    <QueryClientProvider client={queryClient}>
      <DataSourceContext value={mockDs}>
        <MemoryRouter>{ui}</MemoryRouter>
      </DataSourceContext>
    </QueryClientProvider>,
  )
}

describe('Overview section', () => {
  it('renders KPI cards for sites, licenses and Azure spend from fixtures', async () => {
    renderWithProviders(<Overview />)

    // Sites KPI (4 sites from SharePoint fixtures).
    expect(await screen.findByText('SharePoint sites')).toBeInTheDocument()

    // Licenses KPI (consumed seats across SKUs).
    expect(await screen.findByText('Licensed seats')).toBeInTheDocument()

    // Azure month-to-date spend KPI (currency from fixtures).
    const spend = await screen.findByText('Azure spend (MTD)')
    expect(spend.parentElement).toHaveTextContent('GBP')
  })
})
