import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { env } from '@/config/env'
import { UserMenu } from './UserMenu'
import { ViewSwitch } from './ViewSwitch'

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold text-ink">Proventeq</span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSwitch />
          {!env.useMock && <UserMenu />}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
