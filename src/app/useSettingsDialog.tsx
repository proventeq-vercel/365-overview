import { useRef, useState, type MouseEvent, type RefObject } from 'react'
import { SettingsDialog, type SettingsField } from './SettingsDialog'

export function useSettingsDialog(fallbackFocus: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState<SettingsField | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const openSettings = (field: SettingsField) => (event: MouseEvent<HTMLElement>) => {
    trigger.current = event.currentTarget
    setFocus(field)
    setOpen(true)
  }
  const returnFocus = () => (trigger.current?.isConnected ? trigger.current : fallbackFocus.current)
  const dialog = focus !== null && (
    <SettingsDialog open={open} onOpenChange={setOpen} focus={focus} finalFocus={returnFocus} />
  )
  return { openSettings, dialog }
}
