import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutGrid, FolderKanban, KeyRound, Building2, Mail, Cloud,
} from 'lucide-react'
import { env } from '@/config/env'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'

interface NavItem { to: string; label: string; Icon: typeof LayoutGrid; end?: boolean }

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', Icon: LayoutGrid, end: true },
  { to: '/sharepoint', label: 'SharePoint', Icon: FolderKanban },
  { to: '/licensing', label: 'Licensing', Icon: KeyRound },
  { to: '/estate', label: 'Estate', Icon: Building2 },
  { to: '/exchange', label: 'Exchange', Icon: Mail },
  { to: '/azure', label: 'Azure', Icon: Cloud },
]

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-surface px-4 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">P</span>
          <span className="text-lg font-bold text-ink">Proventeq</span>
        </div>
        <nav aria-label="Sections" className="flex flex-col gap-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-muted',
                  isActive && 'bg-brand/12 font-semibold text-brand-strong',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-4">
          <div className="text-sm font-semibold text-ink-soft">Microsoft 365 &amp; Azure Estate</div>
          <div className="flex items-center gap-3">{!env.useMock && <UserMenu />}</div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children ?? <Outlet />}</main>
      </div>

      {/* Mobile top nav */}
      <nav aria-label="Sections mobile" className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-hairline bg-surface py-2 md:hidden">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 px-2 text-[11px] text-ink-soft', isActive && 'text-brand-strong')}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
