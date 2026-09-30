import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings, saveSettings } from './settings'

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips saved settings', () => {
    const custom = {
      ratePerGb: 0.17,
      currency: 'EUR',
      entitlementOverrideBytes: 42,
      oneDriveEntitlementOverrideBytes: 7,
      inactiveYears: 5,
    }
    saveSettings(custom)
    expect(loadSettings()).toEqual(custom)
  })

  it('counts a site as inactive after three years by default', () => {
    expect(DEFAULT_SETTINGS.inactiveYears).toBe(3)
  })

  it('falls back to three years for a stored inactivity window below one year or of the wrong shape', () => {
    for (const stored of ['0', '-2', '"five"', 'null']) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, `{"inactiveYears":${stored}}`)
      expect(loadSettings().inactiveYears).toBe(3)
    }
  })

  it('keeps the inactivity window to whole years within ten', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"inactiveYears":25}')
    expect(loadSettings().inactiveYears).toBe(10)
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"inactiveYears":4.6}')
    expect(loadSettings().inactiveYears).toBe(5)
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

  it('reads a stored OneDrive per-user override of the wrong shape as no override', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"oneDriveEntitlementOverrideBytes":"1TB"}')
    expect(loadSettings().oneDriveEntitlementOverrideBytes).toBeNull()
  })

  it('keeps a stored OneDrive per-user override that is a real number', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"oneDriveEntitlementOverrideBytes":2048}')
    expect(loadSettings().oneDriveEntitlementOverrideBytes).toBe(2048)
  })

  it('reads a zero or negative OneDrive per-user override as no override, so the field and the report agree', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"oneDriveEntitlementOverrideBytes":0}')
    expect(loadSettings().oneDriveEntitlementOverrideBytes).toBeNull()
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"oneDriveEntitlementOverrideBytes":-5}')
    expect(loadSettings().oneDriveEntitlementOverrideBytes).toBeNull()
  })

  it('defaults the OneDrive per-user override to null, so the licence estimate is used', () => {
    expect(DEFAULT_SETTINGS.oneDriveEntitlementOverrideBytes).toBeNull()
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
