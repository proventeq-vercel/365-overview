import { Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { env } from '@/config/env'
import { Logo } from '@/design/Logo'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useOrg } from '@/hooks/useStorageOverview'
import { cn } from '@/lib/utils'
import { SettingsPopover } from './SettingsPopover'
import { UserMenu } from './UserMenu'

function TenantName() {
  const org = useOrg()
  if (org.isPending) return <Skeleton className="h-4 w-32" aria-label="Loading tenant" />
  return (
    <span className="truncate text-sm font-semibold text-p365-navy">
      {org.data?.displayName ?? 'Your tenant'}
    </span>
  )
}

function RefreshButton() {
  const { refresh, isRefreshing } = useRefreshReport()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Refresh"
      title="Refresh report data"
      disabled={isRefreshing}
      onClick={() => {
        void refresh()
      }}
    >
      <RefreshCw
        aria-hidden="true"
        className={cn(isRefreshing && 'animate-spin motion-reduce:animate-none')}
      />
    </Button>
  )
}

export function Header({ onOpenMenu }: { onOpenMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-p365-grey-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        {onOpenMenu && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="-ml-2"
            onClick={onOpenMenu}
          >
            <Menu aria-hidden="true" />
          </Button>
        )}
        <Logo className="h-6 text-p365-navy" />
        <span className="hidden h-6 w-px bg-p365-grey-100 sm:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center">
          <TenantName />
        </div>
        <div className="flex items-center gap-1">
          <RefreshButton />
          <SettingsPopover />
          {!env.useMock && (
            <>
              <span className="mx-1 h-6 w-px bg-p365-grey-100" aria-hidden="true" />
              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
