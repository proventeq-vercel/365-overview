import { useState, type ReactNode } from 'react'
import type { ReportDefinition } from '@/features/registry'
import { SideMenu } from './SideMenu'
import { Header } from './Header'

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
  const hasMenu = menuEnabled && reports.length > 1

  return (
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
    </ShellLayout>
  )
}
