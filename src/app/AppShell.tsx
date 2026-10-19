import { useMemo, useState, type ReactNode } from 'react'
import { env } from '@/config/env'
import type { ReportDefinition } from '@/features/registry'
import { AdminBar } from './AdminBar'
import { AdminBarContext } from './adminBarContext'
import { SideMenu } from './SideMenu'
import { Header } from './Header'

const ADMIN_BAR_HIDDEN_KEY = 'm365-overview:admin-bar-hidden'

function adminBarHidden(): boolean {
  try {
    return window.sessionStorage.getItem(ADMIN_BAR_HIDDEN_KEY) === 'true'
  } catch {
    return false
  }
}

function rememberAdminBarHidden(hidden: boolean) {
  try {
    if (hidden) window.sessionStorage.setItem(ADMIN_BAR_HIDDEN_KEY, 'true')
    else window.sessionStorage.removeItem(ADMIN_BAR_HIDDEN_KEY)
  } catch {
    return
  }
}

function navigate(href: string) {
  window.location.assign(href)
}

export function ShellLayout({
  header,
  menu,
  children,
}: {
  header: ReactNode
  menu?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-p365-page text-p365-navy">
      {header}
      <div className="flex flex-1 items-start">
        {menu}
        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppShell({
  reports,
  menuEnabled,
  children,
}: {
  reports: readonly ReportDefinition[]
  menuEnabled: boolean
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminBarOpen, setAdminBarOpen] = useState(() => env.admin && !adminBarHidden())
  const hasMenu = menuEnabled && reports.length > 1
  const adminBar = useMemo(
    () => ({
      available: env.admin,
      open: adminBarOpen,
      setOpen: (open: boolean) => {
        rememberAdminBarHidden(!open)
        setAdminBarOpen(open)
      },
    }),
    [adminBarOpen],
  )

  return (
    <AdminBarContext value={adminBar}>
      <ShellLayout
        header={
          <Header
            menuOpen={hasMenu ? menuOpen : undefined}
            onToggleMenu={hasMenu ? () => setMenuOpen((open) => !open) : undefined}
          />
        }
        menu={hasMenu && <SideMenu reports={reports} open={menuOpen} onClose={() => setMenuOpen(false)} />}
      >
        {children}
        {env.admin && <AdminBar env={env} navigate={navigate} />}
      </ShellLayout>
    </AdminBarContext>
  )
}
