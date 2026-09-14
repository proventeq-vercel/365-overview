import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { env } from '@/config/env'
import { Logo } from '@/design/Logo'
import { useOrg } from '@/hooks/useStorageOverview'
import { AccountChip } from './AccountChip'
import { HeaderActions } from './HeaderActions'

function TenantName() {
  const org = useOrg()
  if (org.isPending) return <Skeleton className="h-4 w-32" aria-label="Loading tenant" />
  return (
    <span className="truncate text-sm font-semibold text-p365-navy">
      {org.data?.displayName ?? 'Your tenant'}
    </span>
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
        <Logo className="h-8 text-p365-navy" />
        <span className="hidden h-6 w-px bg-p365-grey-100 sm:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center">
          <TenantName />
        </div>
        <div className="flex items-center gap-2">
          {!env.useMock && <AccountChip />}
          <HeaderActions />
        </div>
      </div>
    </header>
  )
}
