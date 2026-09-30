export interface ReportSettings {
  ratePerGb: number
  currency: string
  entitlementOverrideBytes: number | null
  oneDriveEntitlementOverrideBytes: number | null
  inactiveYears: number
}

export const SETTINGS_STORAGE_KEY = 'm365-storage-settings'

export const MAX_INACTIVE_YEARS = 10

export const DEFAULT_SETTINGS: ReportSettings = {
  ratePerGb: 0.02,
  currency: 'GBP',
  entitlementOverrideBytes: null,
  oneDriveEntitlementOverrideBytes: null,
  inactiveYears: 3,
}

const CURRENCY_CODE = /^[A-Z]{3}$/

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_CODE.test(value)
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const positiveOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const isRate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

function inactiveYearsOrDefault(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return DEFAULT_SETTINGS.inactiveYears
  }
  return Math.min(MAX_INACTIVE_YEARS, Math.round(value))
}

export function sanitizeSettings(candidate: Partial<ReportSettings>): ReportSettings {
  return {
    ratePerGb: isRate(candidate.ratePerGb) ? candidate.ratePerGb : DEFAULT_SETTINGS.ratePerGb,
    currency: isCurrencyCode(candidate.currency) ? candidate.currency : DEFAULT_SETTINGS.currency,
    entitlementOverrideBytes: finiteOrNull(candidate.entitlementOverrideBytes),
    oneDriveEntitlementOverrideBytes: positiveOrNull(candidate.oneDriveEntitlementOverrideBytes),
    inactiveYears: inactiveYearsOrDefault(candidate.inactiveYears),
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
