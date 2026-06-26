import type { ReactNode } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { GRAPH_SCOPES } from '../auth/msalConfig'
import { env } from '../config/env'

interface LoginGateProps {
  children: ReactNode
  /**
   * Test/override hook. When provided, it forces the authenticated state and
   * MSAL is never consulted — this lets the component be exercised in unit tests
   * without an MsalProvider. Leave it undefined in the app so the real
   * `useIsAuthenticated()` result (or mock mode) decides.
   */
  authenticated?: boolean
}

function SignInScreen({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <div className="login-gate">
      <div className="login-gate__card">
        <div className="login-gate__brand">M365 Overview</div>
        <h1 className="login-gate__title">Sign in to continue</h1>
        <p className="login-gate__lead">
          Access the Microsoft 365 and Azure estate dashboard with your work account.
        </p>
        <button type="button" className="login-gate__button" onClick={onSignIn}>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  )
}

/** MSAL-connected gate. Only mounted when no override is supplied, so the MSAL
 *  hooks below never run in unit tests. */
function ConnectedLoginGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { instance } = useMsal()

  if (env.useMock || isAuthenticated) {
    return <>{children}</>
  }
  return (
    <SignInScreen onSignIn={() => void instance.loginRedirect({ scopes: GRAPH_SCOPES })} />
  )
}

/**
 * Gates the app behind authentication. Renders children when the user is signed
 * in (or when running in mock mode, where no real auth is required); otherwise
 * shows a centered sign-in screen. Pass `authenticated` to override in tests.
 */
export function LoginGate({ children, authenticated }: LoginGateProps) {
  if (authenticated !== undefined) {
    return authenticated ? <>{children}</> : <SignInScreen />
  }
  return <ConnectedLoginGate>{children}</ConnectedLoginGate>
}
