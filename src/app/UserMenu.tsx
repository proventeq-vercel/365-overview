import { useMsal } from '@azure/msal-react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UserMenu() {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  if (!account) return null

  return (
    <div className="flex items-center gap-3">
      {account.name && <span className="text-sm text-muted-foreground">{account.name}</span>}
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
