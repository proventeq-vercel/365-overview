import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/settings'
import { SettingsProvider } from './SettingsProvider'
import { useSettings } from './useSettings'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
)

const tenantKey = { current: 'tenant-a' }

afterEach(() => {
  cleanup()
  localStorage.clear()
  tenantKey.current = 'tenant-a'
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
      ratePerGb: DEFAULT_SETTINGS.ratePerGb,
      currency: 'EUR',
      entitlementOverrides: {},
    })
  })

  it('keeps an entitlement entered for one tenant away from the next tenant to sign in', () => {
    const { result, rerender } = renderHook(() => useSettings(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <SettingsProvider tenantKey={tenantKey.current}>{children}</SettingsProvider>
      ),
    })
    act(() => result.current.update({ entitlementOverrideBytes: 5000 }))
    expect(result.current.settings.entitlementOverrideBytes).toBe(5000)

    tenantKey.current = 'tenant-b'
    rerender()
    expect(result.current.settings.entitlementOverrideBytes).toBeNull()
    act(() => result.current.update({ currency: 'EUR', entitlementOverrideBytes: 7000 }))

    tenantKey.current = 'tenant-a'
    rerender()
    expect(result.current.settings).toEqual({ ratePerGb: 0.16, currency: 'EUR', entitlementOverrideBytes: 5000 })
    tenantKey.current = 'tenant-b'
    rerender()
    expect(result.current.settings.entitlementOverrideBytes).toBe(7000)
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
