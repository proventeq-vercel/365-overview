import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  saveSettings,
  settingsForTenant,
  withSettingsUpdate,
} from './settings'

const TENANT_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-4000-8000-000000000002'
const EMPTY = { ratePerGb: 0.02, currency: 'GBP', entitlementOverrides: {} }

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(EMPTY)
  })

  it('round-trips saved settings', () => {
    const custom = { ratePerGb: 0.17, currency: 'EUR', entitlementOverrides: { [TENANT_A]: 42 } }
    saveSettings(custom)
    expect(loadSettings()).toEqual(custom)
  })

  it('falls back to defaults on corrupt stored JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json')
    expect(loadSettings()).toEqual(EMPTY)
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
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ entitlementOverrides: { [TENANT_A]: 'lots' } }))
    expect(settingsForTenant(loadSettings(), TENANT_A).entitlementOverrideBytes).toBeNull()
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ entitlementOverrides: [123] }))
    expect(loadSettings().entitlementOverrides).toEqual({})
  })

  it('reads a stored override of zero or less as no override, since the report would ignore it', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ entitlementOverrides: { [TENANT_A]: 0, [TENANT_B]: -2199023255552 } }),
    )
    expect(loadSettings().entitlementOverrides).toEqual({})
  })

  it('keeps a stored override that is a real number, for its own tenant', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ entitlementOverrides: { [TENANT_A]: 123 } }))
    expect(settingsForTenant(loadSettings(), TENANT_A).entitlementOverrideBytes).toBe(123)
  })

  it("never applies one tenant's entitlement to another tenant signed in on the same browser", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ entitlementOverrides: { [TENANT_A]: 123 } }))
    expect(settingsForTenant(loadSettings(), TENANT_B).entitlementOverrideBytes).toBeNull()
  })

  it('drops an override stored before overrides were per tenant, since its tenant is unknown', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"entitlementOverrideBytes":123,"currency":"EUR"}')
    const stored = loadSettings()
    expect(stored.currency).toBe('EUR')
    expect(settingsForTenant(stored, '').entitlementOverrideBytes).toBeNull()
    expect(settingsForTenant(stored, TENANT_A).entitlementOverrideBytes).toBeNull()
  })

  it('does not read an inherited object property as an override', () => {
    expect(settingsForTenant(EMPTY, 'constructor').entitlementOverrideBytes).toBeNull()
  })

  it('sets and clears the override of the tenant being edited and leaves the others alone', () => {
    const both = withSettingsUpdate(
      { ...EMPTY, entitlementOverrides: { [TENANT_B]: 7 } },
      TENANT_A,
      { entitlementOverrideBytes: 5 },
    )
    expect(both.entitlementOverrides).toEqual({ [TENANT_A]: 5, [TENANT_B]: 7 })
    expect(withSettingsUpdate(both, TENANT_A, { entitlementOverrideBytes: null }).entitlementOverrides).toEqual({
      [TENANT_B]: 7,
    })
    expect(withSettingsUpdate(both, TENANT_A, { currency: 'EUR' }).entitlementOverrides).toEqual({
      [TENANT_A]: 5,
      [TENANT_B]: 7,
    })
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
      expect(() => saveSettings(EMPTY)).not.toThrow()
      expect(loadSettings()).toEqual(EMPTY)
    } finally {
      Storage.prototype.getItem = getItem
      Storage.prototype.setItem = setItem
    }
  })
})
