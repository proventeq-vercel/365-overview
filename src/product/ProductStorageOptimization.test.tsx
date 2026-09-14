import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type MockScenario } from '@/data/fixtures'
import { ApiError } from '@/clients/apiError'
import { ProductStorageOptimization } from './ProductStorageOptimization'

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
afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderProduct(scenario: MockScenario = 'healthy', overrides = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ds = { ...createMockDataSource(scenario), ...overrides }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>
          <MemoryRouter initialEntries={['/product']}>{children}</MemoryRouter>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  return render(<ProductStorageOptimization />, { wrapper: Wrapper })
}

describe('ProductStorageOptimization', () => {
  it('renders the product shell around the report with the tenant in the breadcrumb', async () => {
    renderProduct()
    expect(await screen.findByRole('heading', { name: 'Storage Optimisation', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Contoso Ltd')
    expect(screen.getByRole('navigation', { name: 'Product navigation' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { current: 'page' })).toHaveTextContent('Storage Optimisation')
  })

  it('shows the four tenant-capacity cards and the three report sections', async () => {
    renderProduct()
    await screen.findByRole('heading', { name: 'Storage Optimisation', level: 1 })
    for (const label of ['Storage used', 'Remaining', 'Cost of doing nothing', 'Forecast exhaustion']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: /current storage distribution/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /future state & growth impact/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /main offenders/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top SharePoint sites by storage' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Top OneDrives by storage' })).toBeInTheDocument()
  })

  it('offers both views and marks the product view as current', async () => {
    renderProduct()
    await screen.findByRole('heading', { name: 'Storage Optimisation', level: 1 })
    const links = screen.getAllByRole('link', { current: 'page' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent('Product view')
    expect(screen.getByRole('link', { name: 'Sneak peek' })).toHaveAttribute('href', '/')
  })

  it('shows skeleton panels before the data arrives', () => {
    renderProduct()
    expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
  })

  it('keeps the shell and shows the access failure when the report cannot load', async () => {
    renderProduct('healthy', {
      getSites: () => Promise.reject(new ApiError(403, 'forbidden')),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/administrative role/i)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})
