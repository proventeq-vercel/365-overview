import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { loadSettings, sanitizeSettings, saveSettings, type ReportSettings } from '@/lib/settings'
import { SettingsContext } from './settingsContext'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReportSettings>(() => loadSettings())
  const update = useCallback((next: Partial<ReportSettings>) => {
    setSettings((current) => {
      const merged = sanitizeSettings({ ...current, ...next })
      saveSettings(merged)
      return merged
    })
  }, [])
  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext value={value}>{children}</SettingsContext>
}
