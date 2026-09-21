import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { EllipsisVertical, LogOut, RefreshCw, Settings, UserRoundCog } from 'lucide-react'
import { tokenScopes } from '@/auth/msalConfig'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { env } from '@/config/env'
import { DescribedMenuItem } from '@/design/DescribedMenuItem'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { SettingsDialog } from './SettingsDialog'

function RefreshItem() {
  const t = useTranslation()
  const { refresh, isRefreshing } = useRefreshReport()
  return (
    <DescribedMenuItem
      icon={RefreshCw}
      iconClassName={cn(isRefreshing && 'animate-spin motion-reduce:animate-none')}
      label={t('header.refresh')}
      description={isRefreshing ? t('header.refreshing') : t('header.refreshHint')}
      disabled={isRefreshing}
      onClick={() => {
        void refresh()
      }}
    />
  )
}

function AccountItems() {
  const t = useTranslation()
  const { instance, accounts } = useMsal()
  if (!accounts[0]) return null
  return (
    <>
      <DropdownMenuSeparator />
      <DescribedMenuItem
        icon={UserRoundCog}
        label={t('header.switchAccount')}
        description={t('header.switchAccountHint')}
        onClick={() => {
          void instance.loginRedirect({ scopes: tokenScopes(), prompt: 'select_account' })
        }}
      />
      <DescribedMenuItem
        icon={LogOut}
        iconClassName="text-p365-red"
        label={t('header.signOut')}
        description={t('header.signOutHint')}
        onClick={() => {
          void instance.logoutRedirect({ account: instance.getActiveAccount() ?? accounts[0] })
        }}
      />
    </>
  )
}

export function HeaderActions() {
  const t = useTranslation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon" aria-label={t('app.options')} title={t('app.options')} />
          }
        >
          <EllipsisVertical aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label={t('app.options')} className="w-72">
          <RefreshItem />
          <DescribedMenuItem
            icon={Settings}
            label={t('header.settings')}
            description={t('header.settingsHint')}
            onClick={() => setSettingsOpen(true)}
          />
          {env.usesMsal && <AccountItems />}
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
