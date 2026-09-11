import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource, type MockScenario } from '@/data/fixtures'
import { StorageOptimization } from './index'
import { ApiError } from '@/clients/apiError'

const heightDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const widthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 480,
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 800,
  })
})
afterAll(() => {
  if (heightDesc) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', heightDesc)
  if (widthDesc) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', widthDesc)
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderReport(scenario: MockScenario = 'healthy', getSites = createMockDataSource(scenario).getSites) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const source = createMockDataSource(scenario)
  const ds = { ...source, getSites: vi.fn(getSites) }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={ds}>{children}</DataSourceContext>
      </QueryClientProvider>
    )
  }
  return { ...render(<StorageOptimization />, { wrapper: Wrapper }), ds }
}

describe('StorageOptimization report', () => {
  it('renders all three sections against the healthy tenant', async () => {
    renderReport()
    expect(
      await screen.findByRole('heading', { name: /current storage distribution/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /future state & growth impact/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /main offenders/i })).toBeInTheDocument()
  })

  it('warns that the entitlement is estimated, and offers the override', async () => {
    renderReport()
    const banners = await screen.findAllByRole('status')
    expect(banners.some((b) => /estimated from licence counts/i.test(b.textContent ?? ''))).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: /enter the real figure/i })).toBeInTheDocument()
  })

  it('does not warn about concealed names on a tenant that reports them', async () => {
    renderReport()
    await screen.findByRole('heading', { name: /main offenders/i })
    expect(screen.queryByText(/appear as hashes/i)).not.toBeInTheDocument()
  })

  it('explains concealed names, and says the totals are unaffected', async () => {
    renderReport('concealed')
    expect(await screen.findByText(/appear as hashes/i)).toBeInTheDocument()
    expect(screen.getByText(/storage figures are unaffected/i)).toBeInTheDocument()
  })

  it('refuses a forecast on the short-history tenant', async () => {
    renderReport('short-history')
    expect((await screen.findAllByText(/not an all-clear/i)).length).toBeGreaterThan(0)
  })

  it('closes with the full-discovery message', async () => {
    renderReport()
    await screen.findByRole('heading', { name: /main offenders/i })
    expect(screen.getByText(/five calls to Microsoft Graph/i)).toBeInTheDocument()
  })

  it('shows skeletons before the data arrives, never a zero-filled report', () => {
    const { container } = renderReport()
    expect(container.querySelectorAll('[data-slot="card"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
  })

  it('recalculates against an admin override and clears the estimate caveat', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderReport()
    await screen.findByRole('heading', { name: /main offenders/i })

    await user.click(screen.getByRole('button', { name: /enter the real figure/i }))
    await user.type(screen.getByLabelText(/entitlement/i), '40')

    await waitFor(() =>
      expect(screen.queryByText(/estimated from licence counts/i)).not.toBeInTheDocument(),
    )
    expect(JSON.parse(localStorage.getItem('m365-storage-settings')!)).toMatchObject({
      entitlementOverrideBytes: 40 * 1024 * 1_073_741_824,
    })
  })

  it('recalculates a changed setting without re-issuing the Graph calls', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const { ds } = renderReport()
    await screen.findByRole('heading', { name: /main offenders/i })
    expect(ds.getSites).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^settings$/i }))
    await user.clear(screen.getByLabelText(/rate/i))
    await user.type(screen.getByLabelText(/rate/i), '0.5')

    expect(screen.getByRole('heading', { name: /main offenders/i })).toBeInTheDocument()
    expect(ds.getSites).toHaveBeenCalledTimes(1)
  })

  it('routes a consent failure from the data source to the consent screen', async () => {
    renderReport('healthy', () =>
      Promise.reject(new ApiError(403, 'AADSTS65001: The user has not consented')),
    )
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/global administrator/i)
    expect(screen.queryByRole('heading', { name: /main offenders/i })).not.toBeInTheDocument()
  })
})
