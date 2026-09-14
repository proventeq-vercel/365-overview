import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render as renderBare, screen } from '@testing-library/react'
import { AppIntlProvider } from '@/app/AppIntlProvider'
import { useTranslation, type TranslateKey } from './useTranslation'

function Probe({ id, values }: { id: TranslateKey; values?: Record<string, string | number> }) {
  const t = useTranslation()
  return <p>{t(id, values)}</p>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useTranslation', () => {
  it('resolves a catalogue key to its English message', () => {
    renderBare(
      <AppIntlProvider>
        <Probe id="header.signOut" />
      </AppIntlProvider>,
    )
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('interpolates ICU values', () => {
    renderBare(
      <AppIntlProvider>
        <Probe id="settings.entitlementHint" values={{ estimate: '7.8 TB' }} />
      </AppIntlProvider>,
    )
    expect(screen.getByText(/^Estimated from licences: 7\.8 TB\./)).toBeInTheDocument()
  })

  it('falls back to the key itself for a message the catalogue lacks, without logging', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderBare(
      <AppIntlProvider>
        <Probe id={'not.in.catalogue' as TranslateKey} />
      </AppIntlProvider>,
    )
    expect(screen.getByText('not.in.catalogue')).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
  })

  it('renders the message without an IntlProvider only by throwing, so a missing provider is loud', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderBare(<Probe id="header.signOut" />)).toThrow(/IntlProvider/)
  })
})
