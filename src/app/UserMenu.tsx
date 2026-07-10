import { useMsal } from '@azure/msal-react'

/**
 * Shows the signed-in user's name and a sign-out button. Calls `useMsal()`, so
 * it must only be rendered in live mode (inside an `MsalProvider`). Layout
 * guards this behind `!env.useMock` so mock mode stays MSAL-free.
 */
export function UserMenu() {
  const { instance, accounts } = useMsal()
  const userName = accounts[0]?.name

  return (
    <div className="flex items-center gap-2 rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink hover:bg-muted">
      {userName && <span>{userName}</span>}
      {accounts.length > 0 && (
        <button
          type="button"
          onClick={() => {
            void instance.logoutRedirect()
          }}
        >
          Sign out
        </button>
      )}
    </div>
  )
}
