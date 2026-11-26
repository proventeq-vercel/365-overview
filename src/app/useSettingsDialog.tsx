import { useState } from 'react'
import { SettingsDialog, type SettingsField } from './SettingsDialog'

export function useSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState<SettingsField | null>(null)
  const openSettings = (field: SettingsField) => () => {
    setFocus(field)
    setOpen(true)
  }
  const dialog = focus !== null && <SettingsDialog open={open} onOpenChange={setOpen} focus={focus} />
  return { openSettings, dialog }
}
