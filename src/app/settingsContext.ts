import { createContext } from 'react'
import type { ReportSettings } from '@/lib/settings'

export interface SettingsContextValue {
  settings: ReportSettings
  update: (next: Partial<ReportSettings>) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
