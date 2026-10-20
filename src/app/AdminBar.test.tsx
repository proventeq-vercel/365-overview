import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { AdminBar, type AdminEnv } from './AdminBar'
import { AdminBarContext } from './adminBarContext'

afterEach(cleanup)

const mockHealthy: AdminEnv = {
  features: new Set(['optimization.storage.report.overview']),
  useMock: true,
  mockScenario: 'healthy',
  hideNames: false,
}

function renderBar(env: AdminEnv = mockHealthy, open = true) {
  const navigate = vi.fn()
  const setOpen = vi.fn()
  render(
    <AdminBarContext value={{ available: true, open, setOpen }}>
      <AdminBar env={env} navigate={navigate} />
    </AdminBarContext>,
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
