import { useState, type ReactNode } from 'react'
import { env } from '@/config/env'
import { FloatingMenu } from './FloatingMenu'
import { Header } from './Header'

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-p365-page text-p365-navy">
      <Header onOpenMenu={env.showMenu ? () => setMenuOpen(true) : undefined} />
      {env.showMenu && <FloatingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
