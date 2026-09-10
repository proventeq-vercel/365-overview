import type { ReactNode } from 'react'
import { env } from '@/config/env'
import { UserMenu } from './UserMenu'

interface ReportShellProps {
  tenantName?: string
  asOf?: string
  children: ReactNode
}

export function ReportShell({ tenantName, asOf, children }: ReportShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">P</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-ink">Proventeq</span>
            <span className="text-xs text-muted-foreground">Security &amp; Oversharing sneak peek</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            {tenantName && <span className="text-sm font-semibold text-ink">{tenantName}</span>}
            {asOf && <span className="text-xs text-muted-foreground">Reports as of {asOf}</span>}
          </div>
          {!env.useMock && <UserMenu />}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-6 py-6">
        {children}
      </main>
    </div>
  )
}
