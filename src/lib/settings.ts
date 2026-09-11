export interface ReportSettings {
  ratePerGb: number
  currency: string
  entitlementOverrideBytes: number | null
}

export const SETTINGS_STORAGE_KEY = 'm365-storage-settings'

export const DEFAULT_SETTINGS: ReportSettings = {
  ratePerGb: 0.16,
  currency: 'GBP',
  entitlementOverrideBytes: null,
}

const CURRENCY_CODE = /^[A-Z]{3}$/

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_CODE.test(value)
}

const isRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export function sanitizeSettings(candidate: Partial<ReportSettings>): ReportSettings {
  return {
    ratePerGb: isRate(candidate.ratePerGb) ? candidate.ratePerGb : DEFAULT_SETTINGS.ratePerGb,
    currency: isCurrencyCode(candidate.currency) ? candidate.currency : DEFAULT_SETTINGS.currency,
    entitlementOverrideBytes:
      typeof candidate.entitlementOverrideBytes === 'number' &&
      Number.isFinite(candidate.entitlementOverrideBytes)
        ? candidate.entitlementOverrideBytes
        : null,
  }
}

export function loadSettings(): ReportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return sanitizeSettings(JSON.parse(raw) as Partial<ReportSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: ReportSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}
