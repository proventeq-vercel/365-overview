import { useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { EllipsisVertical, LogOut, RefreshCw, Settings, UserRoundCog } from 'lucide-react'
import { GRAPH_SCOPES } from '@/auth/msalConfig'
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
import { cn } from '@/lib/utils'
import { SettingsDialog } from './SettingsDialog'

function RefreshItem() {
  const { refresh, isRefreshing } = useRefreshReport()
  return (
    <DescribedMenuItem
      icon={RefreshCw}
      iconClassName={cn(isRefreshing && 'animate-spin motion-reduce:animate-none')}
      label="Refresh data"
      description={isRefreshing ? 'Reloading from Microsoft Graph…' : 'Reload the report from Microsoft Graph'}
      disabled={isRefreshing}
      onClick={() => {
        void refresh()
      }}
    />
  )
}

function AccountItems() {
  const { instance, accounts } = useMsal()
  if (!accounts[0]) return null
  return (
    <>
      <DropdownMenuSeparator />
      <DescribedMenuItem
        icon={UserRoundCog}
        label="Switch account"
        description="Sign in with a different Microsoft account"
        onClick={() => {
          void instance.loginRedirect({ scopes: GRAPH_SCOPES, prompt: 'select_account' })
        }}
      />
      <DescribedMenuItem
        icon={LogOut}
        iconClassName="text-p365-red"
        label="Sign out"
        description="End this session"
        onClick={() => {
          void instance.logoutRedirect()
        }}
      />
    </>
  )
}

export function HeaderActions() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon" aria-label="Options" title="Options" />
          }
        >
          <EllipsisVertical aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label="Options" className="w-72">
          <RefreshItem />
          <DescribedMenuItem
            icon={Settings}
            label="Report settings"
            description="Currency, cost per GB and the SharePoint entitlement"
            onClick={() => setSettingsOpen(true)}
          />
          {!env.useMock && <AccountItems />}
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
