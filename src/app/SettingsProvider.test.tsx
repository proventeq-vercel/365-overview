import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/settings'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './useSettings'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
)

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('settings context', () => {
  it('starts from what the browser stored, falling back to the defaults', () => {
    const { result, unmount } = renderHook(() => useSettings(), { wrapper })
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    unmount()

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ currency: 'EUR' }))
    const stored = renderHook(() => useSettings(), { wrapper })
    expect(stored.result.current.settings.currency).toBe('EUR')
  })

  it('merges a partial update, sanitises it and persists the result', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => result.current.update({ ratePerGb: -1, currency: 'EUR' }))
    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, currency: 'EUR' })
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual({
      ...DEFAULT_SETTINGS,
      currency: 'EUR',
    })
  })

  it('refuses to run outside the provider', () => {
    function Bare() {
      useSettings()
      return null
    }
    expect(() => render(<Bare />)).toThrow(/inside SettingsProvider/)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })
})
