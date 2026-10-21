import { createContext, useContext } from 'react'

export interface AdminBarState {
  available: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

export const AdminBarContext = createContext<AdminBarState>({
  available: false,
  open: false,
  setOpen: () => {},
})

export function useAdminBar(): AdminBarState {
  return useContext(AdminBarContext)
}
