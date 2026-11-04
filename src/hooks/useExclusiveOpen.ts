import { useCallback, useId, useSyncExternalStore } from 'react'

let openId: string | null = null
const listeners = new Set<() => void>()

function setOpenId(next: string | null) {
  if (openId === next) return
  openId = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useExclusiveOpen() {
  const id = useId()
  const isOpen = useCallback(() => openId === id, [id])
  const open = useSyncExternalStore(subscribe, isOpen, isOpen)
  const setOpen = useCallback(
    (next: boolean) => {
      if (next) setOpenId(id)
      else if (openId === id) setOpenId(null)
    },
    [id],
  )
  return [open, setOpen] as const
}
