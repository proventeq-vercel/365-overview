export interface ReportSettings {
  ratePerGb: number
  currency: string
  entitlementOverrideBytes: number | null
}

export interface StoredSettings {
  ratePerGb: number
  currency: string
  entitlementOverrides: Record<string, number>
}

export const SETTINGS_STORAGE_KEY = 'm365-storage-settings'

export const DEFAULT_SETTINGS: ReportSettings = {
  ratePerGb: 0.16,
  currency: 'GBP',
  entitlementOverrideBytes: null,
}

const DEFAULT_STORED: StoredSettings = {
  ratePerGb: DEFAULT_SETTINGS.ratePerGb,
  currency: DEFAULT_SETTINGS.currency,
  entitlementOverrides: {},
}

const CURRENCY_CODE = /^[A-Z]{3}$/

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_CODE.test(value)
}

export const isRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const isEntitlementOverride = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

function sanitizeOverrides(candidate: unknown): Record<string, number> {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return {}
  return Object.fromEntries(
    Object.entries(candidate).filter((entry): entry is [string, number] => isEntitlementOverride(entry[1])),
  )
}

export function sanitizeSettings(candidate: Partial<StoredSettings>): StoredSettings {
  return {
    ratePerGb: isRate(candidate.ratePerGb) ? candidate.ratePerGb : DEFAULT_STORED.ratePerGb,
    currency: isCurrencyCode(candidate.currency) ? candidate.currency : DEFAULT_STORED.currency,
    entitlementOverrides: sanitizeOverrides(candidate.entitlementOverrides),
  }
}

export function settingsForTenant(stored: StoredSettings, tenantKey: string): ReportSettings {
  return {
    ratePerGb: stored.ratePerGb,
    currency: stored.currency,
    entitlementOverrideBytes: Object.hasOwn(stored.entitlementOverrides, tenantKey)
      ? stored.entitlementOverrides[tenantKey]
      : null,
  }
}

export function withSettingsUpdate(
  stored: StoredSettings,
  tenantKey: string,
  next: Partial<ReportSettings>,
): StoredSettings {
  const { entitlementOverrideBytes, ...shared } = next
  const entitlementOverrides = { ...stored.entitlementOverrides }
  if (entitlementOverrideBytes === null) delete entitlementOverrides[tenantKey]
  else if (entitlementOverrideBytes !== undefined) entitlementOverrides[tenantKey] = entitlementOverrideBytes
  return sanitizeSettings({ ...stored, ...shared, entitlementOverrides })
}

export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_STORED
    return sanitizeSettings(JSON.parse(raw) as Partial<StoredSettings>)
  } catch {
    return DEFAULT_STORED
  }
}

export function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}
