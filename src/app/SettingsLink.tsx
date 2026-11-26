import type { ReactNode } from 'react'

export function SettingsLink({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-sm font-semibold text-p365-teal underline-offset-2 outline-none transition-colors duration-150 ease-out hover:underline focus-visible:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onOpen}
    >
      {children}
    </button>
  )
}
