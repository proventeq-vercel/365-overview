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

export function loadSettings(): ReportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<ReportSettings>
    return {
      ratePerGb:
        typeof parsed.ratePerGb === 'number'
          ? parsed.ratePerGb
          : DEFAULT_SETTINGS.ratePerGb,
      currency:
        typeof parsed.currency === 'string' ? parsed.currency : DEFAULT_SETTINGS.currency,
      entitlementOverrideBytes:
        typeof parsed.entitlementOverrideBytes === 'number'
          ? parsed.entitlementOverrideBytes
          : null,
    }
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
