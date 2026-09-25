import type { ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { env } from '@/config/env'
import { Logo } from '@/design/Logo'
import { useOrg } from '@/hooks/useStorageOverview'
import { useTranslation } from '@/hooks/useTranslation'
import { AccountChip } from './AccountChip'
import { HeaderActions } from './HeaderActions'
import { SIDE_MENU_ID } from './SideMenu'

export function TenantSkeleton() {
  const t = useTranslation()
  return <Skeleton className="h-4 w-32" aria-label={t('app.loadingTenant')} />
}

function TenantName() {
  const t = useTranslation()
  const org = useOrg()
  if (org.isPending) return <TenantSkeleton />
  return (
    <span className="truncate text-sm font-semibold text-p365-navy">
      {org.data?.displayName ?? t('app.tenantFallback')}
    </span>
  )
}

export function HeaderFrame({
  leading,
  tenant,
  actions,
}: {
  leading?: ReactNode
  tenant: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-p365-grey-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        {leading}
        <Logo className="h-8 text-p365-navy" />
        <span className="hidden h-6 w-px bg-p365-grey-100 sm:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center">{tenant}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Header({
  menuOpen,
  onToggleMenu,
}: {
  menuOpen?: boolean
  onToggleMenu?: () => void
}) {
  const t = useTranslation()
  return (
    <HeaderFrame
      leading={
        onToggleMenu && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={menuOpen ? t('app.closeMenu') : t('app.openMenu')}
            aria-expanded={menuOpen}
            aria-controls={SIDE_MENU_ID}
            className="-ml-2"
            onClick={onToggleMenu}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        )
      }
      tenant={<TenantName />}
      actions={
        <>
          {env.usesMsal && <AccountChip />}
          <HeaderActions />
        </>
      }
    />
  )
}
