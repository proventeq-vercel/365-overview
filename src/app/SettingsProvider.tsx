import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  loadSettings,
  saveSettings,
  settingsForTenant,
  withSettingsUpdate,
  type ReportSettings,
  type StoredSettings,
} from '@/lib/settings'
import { SettingsContext } from './settingsContext'

export function SettingsProvider({ tenantKey = '', children }: { tenantKey?: string; children: ReactNode }) {
  const [stored, setStored] = useState<StoredSettings>(() => loadSettings())
  const update = useCallback(
    (next: Partial<ReportSettings>) => {
      setStored((current) => {
        const merged = withSettingsUpdate(current, tenantKey, next)
        saveSettings(merged)
        return merged
      })
    },
    [tenantKey],
  )
  const settings = useMemo(() => settingsForTenant(stored, tenantKey), [stored, tenantKey])
  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext value={value}>{children}</SettingsContext>
}
