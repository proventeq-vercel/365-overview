import { useEffect, useState, type ReactNode } from 'react'
import { MsalProvider } from '@azure/msal-react'
import { getMsalInstance } from './msalConfig'
import { MsalAuthHandler } from './MsalAuthHandler'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { AuthErrorScreen } from './AuthErrorScreen'
import { useTranslation } from '../hooks/useTranslation'

type Initialisation = { state: 'pending' } | { state: 'ready' } | { state: 'failed'; error: unknown }

export function MsalAuthProvider({ children }: { children: ReactNode }) {
  const t = useTranslation()
  const [initialisation, setInitialisation] = useState<Initialisation>({ state: 'pending' })

  useEffect(() => {
    const initMsal = async () => {
      try {
        await getMsalInstance().initialize()
        setInitialisation({ state: 'ready' })
      } catch (error) {
        console.error('MSAL Initialization Error:', error)
        setInitialisation({ state: 'failed', error })
      }
    }
    void initMsal()
  }, [])

  if (initialisation.state === 'failed') {
    return <AuthErrorScreen error={initialisation.error} />
  }

  if (initialisation.state === 'pending') {
    return <AuthLoadingScreen title={t('auth.initializing')} />
  }

  return (
    <MsalProvider instance={getMsalInstance()}>
      <MsalAuthHandler>{children}</MsalAuthHandler>
    </MsalProvider>
  )
}
