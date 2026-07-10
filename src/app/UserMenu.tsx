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
    <>
      {userName && <span className="topbar__user">{userName}</span>}
      {accounts.length > 0 && (
        <button
          type="button"
          className="topbar__signout"
          onClick={() => {
            void instance.logoutRedirect()
          }}
        >
          Sign out
        </button>
      )}
    </>
  )
}
