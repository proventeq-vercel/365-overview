import { useEffect, useState, type ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'
import {
  type AccountInfo,
  EventType,
  InteractionStatus,
  InteractionType,
} from '@azure/msal-browser'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { AuthErrorScreen } from './AuthErrorScreen'
import { useTranslation } from '../hooks/useTranslation'

export function MsalAuthHandler({ children }: { children: ReactNode }) {
  const t = useTranslation()
  const { instance, accounts, inProgress } = useMsal()
  const [activeAccount, setActiveAccount] = useState<AccountInfo | null>(
    instance.getActiveAccount(),
  )
  const [authError, setAuthError] = useState<unknown>(null)

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
        event.eventType === EventType.LOGIN_FAILURE ||
        (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE &&
          event.interactionType === InteractionType.Redirect)
      ) {
        console.error('Login error:', event.error)
        setAuthError(event.error ?? new Error(t('auth.unknownError')))
      }
    })
    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId)
      }
    }
  }, [instance, t])

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
        setAuthError(error)
      }
    }
    void handleRedirect()
  }, [instance, activeAccount])

  useEffect(() => {
    if (
      !authError &&
      !activeAccount &&
      accounts.length === 0 &&
      inProgress === InteractionStatus.None
    ) {
      instance.loginRedirect().catch((error: unknown) => {
        console.error('Login redirect error', error)
      })
    }
  }, [accounts, activeAccount, authError, inProgress, instance])

  if (authError) {
    return <AuthErrorScreen error={authError} />
  }

  if (inProgress !== InteractionStatus.None) {
    return <AuthLoadingScreen title={t('auth.authenticating')} />
  }

  return <>{children}</>
}
