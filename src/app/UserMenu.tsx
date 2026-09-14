import { useMsal } from '@azure/msal-react'
import { LogOut, UserRoundCog } from 'lucide-react'
import { GRAPH_SCOPES } from '@/auth/msalConfig'
import { Button } from '@/components/ui/button'

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function UserMenu() {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  if (!account) return null
  const name = account.name ?? account.username

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 pr-1">
        <span
          className="grid size-8 place-items-center rounded-full bg-p365-grey-100 text-xs font-semibold text-p365-grey-700"
          aria-hidden="true"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden max-w-48 truncate text-sm text-p365-navy sm:inline">{name}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Switch account"
        title="Switch account"
        onClick={() => {
          void instance.loginRedirect({ scopes: GRAPH_SCOPES, prompt: 'select_account' })
        }}
      >
        <UserRoundCog aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void instance.logoutRedirect()
        }}
      >
        <LogOut aria-hidden="true" data-icon="inline-start" />
        Sign out
      </Button>
    </div>
  )
}
