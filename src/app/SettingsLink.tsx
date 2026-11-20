import { useState, type ReactNode } from 'react'
import { SettingsDialog, type SettingsField } from './SettingsDialog'

export function SettingsLink({ field, children }: { field: SettingsField; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  return (
    <>
      <button
        type="button"
        className="font-semibold text-p365-teal underline-offset-2 transition-colors duration-150 ease-out hover:underline"
        onClick={() => {
          setOpened(true)
          setOpen(true)
        }}
      >
        {children}
      </button>
      {opened && <SettingsDialog open={open} onOpenChange={setOpen} focus={field} />}
    </>
  )
}
