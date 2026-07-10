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
  it('renders health tiles for each service from fixtures', async () => {
    renderWithProviders(<Overview />)
    expect(await screen.findByText('SharePoint')).toBeInTheDocument()
    expect(await screen.findByText('Licensing')).toBeInTheDocument()
    // Azure spend tile carries the fixture currency.
    const azure = await screen.findByText('Azure spend (MTD)')
    expect(azure.closest('a')).toHaveAttribute('href', '/azure')
  })

  it('shows fixture-derived numbers: 4 SharePoint sites and 738 consumed seats', async () => {
    renderWithProviders(<Overview />)
    // sharePoint.totalSites = 4
    expect(await screen.findByText('4 sites')).toBeInTheDocument()
    // licenses consumed = 184 + 412 + 95 + 47 = 738
    expect(await screen.findByText('738 seats')).toBeInTheDocument()
  })
})
