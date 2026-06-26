import { useEffect, useState, type ReactNode } from 'react'
import { MsalProvider } from '@azure/msal-react'
import { getMsalInstance } from './msalConfig'
import { MsalAuthHandler } from './MsalAuthHandler'
import { AuthLoadingScreen } from './AuthLoadingScreen'

/**
 * Initializes the MSAL singleton (MSAL v3+ requires an explicit async
 * `initialize()` before any other API) and then mounts `<MsalProvider>` →
 * `MsalAuthHandler`. Shows a loading screen until initialization completes.
 * Ported from the ProventeqCloud `MsalAuthProvider`. Only mounted in live mode.
 */
export function MsalAuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initMsal = async () => {
      try {
        await getMsalInstance().initialize()
        setIsInitialized(true)
      } catch (error) {
        console.error('MSAL Initialization Error:', error)
      }
    }
    void initMsal()
  }, [])

  if (!isInitialized) {
    return <AuthLoadingScreen title="Initializing…" />
  }

  return (
    <MsalProvider instance={getMsalInstance()}>
      <MsalAuthHandler>{children}</MsalAuthHandler>
    </MsalProvider>
  )
}
