import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@/test/render'
import type { StorageRow } from '@/types/storage'
import { AdminBar, type AdminEnv } from './AdminBar'
import { AdminBarContext } from './adminBarContext'

afterEach(cleanup)

const mockHealthy: AdminEnv = {
  features: new Set(['optimization.storage.report.overview']),
  useMock: true,
  mockScenario: 'healthy',
  hideNames: false,
}

const ownedBy = (ownerDisplayName: string) => ({ ownerDisplayName }) as StorageRow

function renderBar(env: AdminEnv = mockHealthy, open = true, sites?: StorageRow[], drives: StorageRow[] = []) {
  const navigate = vi.fn()
  const setOpen = vi.fn()
  const queryClient = new QueryClient()
  if (sites) queryClient.setQueryData(['storageInputs'], { sites, drives })
  render(
    <QueryClientProvider client={queryClient}>
      <AdminBarContext value={{ available: true, open, setOpen }}>
        <AdminBar env={env} navigate={navigate} />
      </AdminBarContext>
    </QueryClientProvider>,
  )
  return { navigate, setOpen }
}

const bar = () => screen.getByRole('region', { name: 'Admin' })
const hrefOf = (navigate: ReturnType<typeof vi.fn>) => new URL(String(navigate.mock.calls[0][0]), 'http://x')

describe('AdminBar', () => {
  it('shows the tab as it runs now: data source, features and names', () => {
    renderBar()
    expect(screen.getByRole('combobox', { name: 'Data' })).toHaveTextContent('Mock: healthy')
    expect(screen.getByRole('button', { name: 'Storage Optimisation' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'OneDrive Usage' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Report menu' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Hide names' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('writes On or Off on every toggle, not only a colour', () => {
    renderBar()
    const on = screen.getByRole('button', { name: 'Storage Optimisation' })
    const off = screen.getByRole('button', { name: 'OneDrive Usage' })
    expect(within(on).getByText('On')).toBeInTheDocument()
    expect(within(on).queryByText('Off')).not.toBeInTheDocument()
    expect(on).toHaveAttribute('data-state', 'on')
    expect(within(off).getByText('Off')).toBeInTheDocument()
    expect(off).toHaveAttribute('data-state', 'off')
    expect(within(screen.getByRole('button', { name: 'Hide names' })).getByText('Off')).toBeInTheDocument()
  })

  it('marks a chosen toggle as not applied until the tab reloads', async () => {
    const user = userEvent.setup()
    renderBar()
    const oneDrive = screen.getByRole('button', { name: 'OneDrive Usage' })
    expect(screen.getByRole('status')).toHaveTextContent('Running as shown')
    expect(oneDrive).not.toHaveAttribute('data-pending')

    await user.click(oneDrive)
    expect(within(oneDrive).getByText('On')).toBeInTheDocument()
    expect(oneDrive).toHaveAttribute('data-pending', 'true')
    expect(screen.getByRole('button', { name: 'Storage Optimisation' })).not.toHaveAttribute('data-pending')
    expect(screen.getByRole('status')).toHaveTextContent('1 change not applied yet')

    await user.click(screen.getByRole('button', { name: 'Hide names' }))
    expect(screen.getByRole('status')).toHaveTextContent('2 changes not applied yet')

    await user.click(oneDrive)
    await user.click(screen.getByRole('button', { name: 'Hide names' }))
    expect(oneDrive).not.toHaveAttribute('data-pending')
    expect(screen.getByRole('status')).toHaveTextContent('Running as shown')
  })

  it('locks Hide names on when Microsoft conceals the names, and says where to change it', () => {
    renderBar(mockHealthy, true, [ownedBy('6B1F4F0C7B3A4E2D9F8E7A6B5C4D'), ownedBy('0A1B2C3D4E5F60718293A4B5C6D7')])
    const hideNames = screen.getByRole('button', { name: 'Hide names' })
    expect(hideNames).toHaveAttribute('aria-pressed', 'true')
    expect(hideNames).toBeDisabled()
    expect(hideNames).toHaveAccessibleDescription(/Microsoft conceals names in this tenant's reports/)
    expect(hideNames).toHaveAccessibleDescription(/Settings → Org settings → Reports/)
    expect(hideNames).not.toHaveAttribute('data-pending')
    expect(screen.getByRole('status')).toHaveTextContent('Running as shown')
  })

  it('locks Hide names on when only the OneDrive rows came back and Microsoft conceals them', () => {
    renderBar(mockHealthy, true, [], [ownedBy('6B1F4F0C7B3A4E2D9F8E7A6B5C4D'), ownedBy('0A1B2C3D4E5F60718293A4B5C6D7')])
    expect(screen.getByRole('button', { name: 'Hide names' })).toBeDisabled()
  })

  it('leaves Hide names free when the report shows real names', () => {
    renderBar(mockHealthy, true, [ownedBy('Megan Bowen'), ownedBy('Alex Wilber')])
    const hideNames = screen.getByRole('button', { name: 'Hide names' })
    expect(hideNames).toHaveAttribute('aria-pressed', 'false')
    expect(hideNames).toBeEnabled()
    expect(screen.queryByText(/Microsoft conceals names/)).not.toBeInTheDocument()
  })

  it('applies nothing until something changes', () => {
    renderBar()
    expect(screen.getByRole('button', { name: 'Apply and reload' })).toBeDisabled()
  })

  it('reloads with the chosen features in the registry order', async () => {
    const user = userEvent.setup()
    const { navigate } = renderBar()
    await user.click(screen.getByRole('button', { name: 'Report menu' }))
    await user.click(screen.getByRole('button', { name: 'OneDrive Usage' }))
    await user.click(screen.getByRole('button', { name: 'Apply and reload' }))
    expect(hrefOf(navigate).searchParams.get('features')).toBe(
      'optimization.storage.report.overview,optimization.storage.report.onedrive,app.menu',
    )
    expect(hrefOf(navigate).searchParams.get('admin')).toBe('true')
  })

  it('switches a mock tab to the live tenant data', async () => {
    const user = userEvent.setup()
    const { navigate } = renderBar()
    await user.click(screen.getByRole('combobox', { name: 'Data' }))
    await user.click(await screen.findByRole('option', { name: 'Live tenant data' }))
    await user.click(screen.getByRole('button', { name: 'Apply and reload' }))
    expect(hrefOf(navigate).searchParams.get('mock')).toBe('false')
    expect(hrefOf(navigate).searchParams.get('scenario')).toBe('')
  })

  it('resets the tab to the deployed modes, keeping the bar', async () => {
    const user = userEvent.setup()
    const { navigate } = renderBar()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(hrefOf(navigate).search).toBe('?modes=reset&admin=true')
  })

  it('hides itself through the shared state', async () => {
    const user = userEvent.setup()
    const { setOpen } = renderBar()
    await user.click(screen.getByRole('button', { name: 'Hide the admin bar' }))
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('renders nothing while hidden', () => {
    renderBar(mockHealthy, false)
    expect(screen.queryByRole('region', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('is a landmark that stays on screen above the report', () => {
    renderBar()
    expect(bar()).toHaveClass('fixed')
  })
})
