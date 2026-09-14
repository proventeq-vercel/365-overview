import { useState, type ReactNode } from 'react'
import type { ReportDefinition } from '@/features/registry'
import { FloatingMenu } from './FloatingMenu'
import { Header } from './Header'

export function AppShell({
  reports,
  children,
}: {
  reports: readonly ReportDefinition[]
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasMenu = reports.length > 1

  return (
    <div className="flex min-h-screen flex-col bg-p365-page text-p365-navy">
      <Header onOpenMenu={hasMenu ? () => setMenuOpen(true) : undefined} />
      {hasMenu && (
        <FloatingMenu reports={reports} open={menuOpen} onClose={() => setMenuOpen(false)} />
      )}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
