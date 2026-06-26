import { useEffect, useState, type ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'
import {
  type AccountInfo,
  EventType,
  InteractionStatus,
  InteractionType,
} from '@azure/msal-browser'
import { AuthLoadingScreen } from './AuthLoadingScreen'

/**
 * Drives the redirect-based MSAL login lifecycle. Ported from the ProventeqCloud
 * `MsalAuthHandler` (browser path only — no Teams, no Redux, no styled-components
 * or i18n):
 *
 * - Registers an event callback: LOGIN_SUCCESS sets the active account;
 *   LOGOUT_SUCCESS clears it; a redirect ACQUIRE_TOKEN_FAILURE surfaces an error.
 * - Completes any in-flight redirect via `handleRedirectPromise()`.
 * - Auto-triggers `loginRedirect()` when there is no account and no interaction
 *   is in progress.
 * - Renders a loading screen while an interaction is in progress, otherwise the
 *   children (the authenticated app).
 */
export function MsalAuthHandler({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal()
  const [activeAccount, setActiveAccount] = useState<AccountInfo | null>(
    instance.getActiveAccount(),
  )
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const callbackId = instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const account = event.payload as AccountInfo
        instance.setActiveAccount(account)
        setActiveAccount(account)
        setAuthError(null)
      } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
        setActiveAccount(null)
        setAuthError(null)
      } else if (
        event.eventType === EventType.ACQUIRE_TOKEN_FAILURE &&
        event.interactionType === InteractionType.Redirect
      ) {
        console.error('Login error:', event.error)
        setAuthError(
          event.error?.message || 'An unknown authentication error occurred.',
        )
      }
    })
    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId)
      }
    }
  }, [instance])

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise()
        if (response?.account && response.account !== activeAccount) {
          instance.setActiveAccount(response.account)
          setActiveAccount(response.account)
        }
      } catch (error) {
        console.error('MSAL Redirect Error:', error)
      }
    }
    void handleRedirect()
  }, [instance, activeAccount])

  useEffect(() => {
    if (
      !activeAccount &&
      accounts.length === 0 &&
      inProgress === InteractionStatus.None
    ) {
      instance.loginRedirect().catch((error: unknown) => {
        console.error('Login redirect error', error)
      })
    }
  }, [accounts, activeAccount, inProgress, instance])

  if (authError) {
    return (
      <div className="auth-screen">
        <div className="error-state" style={{ maxWidth: '480px', width: '100%' }}>
          <p className="error-state__message">Sign-in failed</p>
          <p className="error-state__hint">{authError}</p>
        </div>
      </div>
    )
  }

  if (inProgress !== InteractionStatus.None) {
    return <AuthLoadingScreen title="Authenticating…" />
  }

  return <>{children}</>
}
