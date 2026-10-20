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

const snapshot = () => openId

export function useExclusiveOpen() {
  const id = useId()
  const open = useSyncExternalStore(subscribe, snapshot, snapshot) === id
  const setOpen = useCallback((next: boolean) => setOpenId(next ? id : null), [id])
  return [open, setOpen] as const
}
