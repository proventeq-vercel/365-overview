import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { render } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DataSourceContext } from '@/data/useDataSource'
import { createMockDataSource } from '@/data/fixtures'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type ReportSettings } from '@/lib/settings'
import { SettingsDialog } from './SettingsDialog'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './useSettings'

const GB = 1_073_741_824

function Probe({ onChange }: { onChange: (settings: ReportSettings) => void }) {
  const { settings } = useSettings()
  onChange(settings)
  return null
}

function renderDialog(initial?: Partial<ReportSettings>, open = true) {
  if (initial) localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(initial))
  const onChange = vi.fn()
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DataSourceContext value={createMockDataSource('healthy')}>
          <SettingsProvider>{children}</SettingsProvider>
        </DataSourceContext>
      </QueryClientProvider>
    )
  }
  render(
    <>
      <SettingsDialog open={open} onOpenChange={onOpenChange} />
      <Probe onChange={onChange} />
    </>,
    { wrapper: Wrapper },
  )
  return { onChange, onOpenChange }
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SettingsDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog(undefined, false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('SharePoint entitlement')).not.toBeInTheDocument()
  })

  it('is a titled dialog with a close button', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    expect(screen.getByRole('dialog', { name: 'Report settings' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.anything())
  })

  it('lifts an entitlement override in bytes, converted from TB', async () => {
    const user = userEvent.setup()
    const { onChange } = renderDialog()
    await user.type(screen.getByLabelText('SharePoint entitlement'), '5')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ entitlementOverrideBytes: 5 * 1024 * GB }),
    )
  })

  it('clears the override when the field is emptied, rather than reading it as zero', async () => {
    const user = userEvent.setup()
    const { onChange } = renderDialog({ entitlementOverrideBytes: 5 * 1024 * GB })
    expect(screen.getByLabelText('SharePoint entitlement')).toHaveValue(5)
    await user.clear(screen.getByLabelText('SharePoint entitlement'))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ entitlementOverrideBytes: null }),
    )
  })

  it('tells the admin what the licence estimate is, so they know what they are replacing', async () => {
    renderDialog()
    expect(await screen.findByText(/estimated from licences: 7\.8 TB/i)).toBeInTheDocument()
  })

  it('lifts a changed rate', async () => {
    const user = userEvent.setup()
    const { onChange } = renderDialog()
    const rate = screen.getByLabelText('Cost per GB per month')
    await user.clear(rate)
    await user.type(rate, '0.35')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ ratePerGb: 0.35 }))
  })

  it('never lifts a negative rate', async () => {
    const { onChange } = renderDialog()
    fireEvent.change(screen.getByLabelText('Cost per GB per month'), { target: { value: '-2' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ratePerGb: DEFAULT_SETTINGS.ratePerGb }),
    )
  })

  it('prefixes the rate with the symbol of the chosen currency', async () => {
    renderDialog({ currency: 'EUR' })
    const rate = screen.getByLabelText('Cost per GB per month')
    expect(rate.parentElement).toHaveTextContent('€')
    expect(rate.parentElement).toHaveTextContent('/ GB / month')
  })

  it('offers currencies by code and name and lifts the one picked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderDialog()
    const currency = screen.getByRole('combobox', { name: 'Currency' })
    expect(currency).toHaveTextContent('GBP')
    expect(currency).toHaveTextContent('British Pound')

    await user.click(currency)
    await user.click(await screen.findByRole('option', { name: /CZK.*Czech Koruna/ }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ currency: 'CZK' }))
  })

  it('keeps a stored currency that is not in the list selectable rather than dropping it', async () => {
    renderDialog({ currency: 'BRL' })
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveTextContent('BRL')
  })
})
