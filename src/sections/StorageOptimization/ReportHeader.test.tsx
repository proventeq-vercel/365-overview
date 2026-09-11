import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETTINGS, type ReportSettings } from '@/lib/settings'
import { ReportHeader } from './ReportHeader'
import { base } from './testFixtures'

function Harness({
  initial = DEFAULT_SETTINGS,
  onChange,
}: {
  initial?: ReportSettings
  onChange: (s: ReportSettings) => void
}) {
  const [settings, setSettings] = useState(initial)
  return (
    <ReportHeader
      overview={base}
      tenantName="Contoso Ltd"
      settings={settings}
      onSettingsChange={(next) => {
        setSettings(next)
        onChange(next)
      }}
    />
  )
}

afterEach(cleanup)

const GB = 1_073_741_824

describe('ReportHeader', () => {
  it('names the tenant and the date the data was refreshed', () => {
    render(
      <ReportHeader
        overview={base}
        tenantName="Contoso Ltd"
        settings={DEFAULT_SETTINGS}
        onSettingsChange={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: /contoso ltd/i })).toBeInTheDocument()
    expect(screen.getByText(/data as of 2026-08-30/i)).toBeInTheDocument()
  })

  it('states that Microsoft usage reports lag', () => {
    render(
      <ReportHeader
        overview={base}
        tenantName="Contoso Ltd"
        settings={DEFAULT_SETTINGS}
        onSettingsChange={() => {}}
      />,
    )
    expect(screen.getByText(/lag by two to three days/i)).toBeInTheDocument()
  })

  it('lifts an entitlement override in bytes, converted from TB', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.type(screen.getByLabelText(/entitlement/i), '5')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ entitlementOverrideBytes: 5 * 1024 * GB }),
    )
  })

  it('clears the override when the field is emptied, rather than reading it as zero', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        initial={{ ...DEFAULT_SETTINGS, entitlementOverrideBytes: 5 * 1024 * GB }}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.clear(screen.getByLabelText(/entitlement/i))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ entitlementOverrideBytes: null }),
    )
  })

  it('lifts a changed rate', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.clear(screen.getByLabelText(/rate/i))
    await user.type(screen.getByLabelText(/rate/i), '0.35')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ ratePerGb: 0.35 }))
  })

  it('keeps the settings panel closed until it is asked for', () => {
    render(
      <ReportHeader
        overview={base}
        tenantName="Contoso Ltd"
        settings={DEFAULT_SETTINGS}
        onSettingsChange={() => {}}
      />,
    )
    expect(screen.queryByLabelText(/entitlement/i)).not.toBeInTheDocument()
  })
})

it('renders the settings control as an icon button that still announces itself as Settings', () => {
  render(
    <ReportHeader
      overview={base}
      tenantName="Contoso"
      settings={DEFAULT_SETTINGS}
      onSettingsChange={() => {}}
    />,
  )
  const button = screen.getByRole('button', { name: 'Settings' })
  expect(button).toHaveAttribute('aria-label', 'Settings')
  expect(button.querySelector('svg')).not.toBeNull()
  expect(button).not.toHaveTextContent('Settings')
})
