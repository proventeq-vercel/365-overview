import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings, saveSettings } from './settings'

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips saved settings', () => {
    const custom = { ratePerGb: 0.17, currency: 'EUR', entitlementOverrideBytes: 42 }
    saveSettings(custom)
    expect(loadSettings()).toEqual(custom)
  })

  it('falls back to defaults on corrupt stored JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('ignores a stored rate of the wrong shape', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"ratePerGb":"free"}')
    expect(loadSettings().ratePerGb).toBe(DEFAULT_SETTINGS.ratePerGb)
  })

  it('ignores a stored currency of the wrong shape', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"currency":99}')
    expect(loadSettings().currency).toBe(DEFAULT_SETTINGS.currency)
  })

  it('ignores a stored currency that is not a three-letter code, which would make Intl throw', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"currency":"GB"}')
    expect(loadSettings().currency).toBe(DEFAULT_SETTINGS.currency)
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"currency":""}')
    expect(loadSettings().currency).toBe(DEFAULT_SETTINGS.currency)
  })

  it('keeps a stored three-letter currency code', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"currency":"EUR"}')
    expect(loadSettings().currency).toBe('EUR')
  })

  it('ignores a stored rate that is negative or not finite', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"ratePerGb":-1}')
    expect(loadSettings().ratePerGb).toBe(DEFAULT_SETTINGS.ratePerGb)
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"ratePerGb":null}')
    expect(loadSettings().ratePerGb).toBe(DEFAULT_SETTINGS.ratePerGb)
  })

  it('keeps a zero rate, which is a legitimate free-storage assumption', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"ratePerGb":0}')
    expect(loadSettings().ratePerGb).toBe(0)
  })

  it('reads a stored override of the wrong shape as no override, not as zero', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"entitlementOverrideBytes":"lots"}')
    expect(loadSettings().entitlementOverrideBytes).toBeNull()
  })

  it('reads a stored override of zero or less as no override, since the report would ignore it', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"entitlementOverrideBytes":0}')
    expect(loadSettings().entitlementOverrideBytes).toBeNull()
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"entitlementOverrideBytes":-2199023255552}')
    expect(loadSettings().entitlementOverrideBytes).toBeNull()
  })

  it('keeps a stored override that is a real number', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"entitlementOverrideBytes":123}')
    expect(loadSettings().entitlementOverrideBytes).toBe(123)
  })

  it('keeps each stored field independently of the others', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"ratePerGb":0.5}')
    const settings = loadSettings()
    expect(settings.ratePerGb).toBe(0.5)
    expect(settings.currency).toBe(DEFAULT_SETTINGS.currency)
  })

  it('defaults the entitlement override to null, so the estimate is used', () => {
    expect(DEFAULT_SETTINGS.entitlementOverrideBytes).toBeNull()
  })

  it("defaults the rate to P365's DefaultCostRatePerGbPerMonth", () => {
    expect(DEFAULT_SETTINGS.ratePerGb).toBe(0.02)
    expect(DEFAULT_SETTINGS.currency).toBe('GBP')
  })

  it('renders a working report when the browser refuses storage', () => {
    const getItem = Storage.prototype.getItem
    const setItem = Storage.prototype.setItem
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled')
    }
    Storage.prototype.setItem = () => {
      throw new Error('storage disabled')
    }
    try {
      expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    } finally {
      Storage.prototype.getItem = getItem
      Storage.prototype.setItem = setItem
    }
  })
})
