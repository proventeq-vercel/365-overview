import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { msalConfig } from './auth/msalConfig'
import { queryClient } from './app/queryClient'
import { DataProvider } from './data/DataProvider'
import App from './App.tsx'
import './index.css'

async function bootstrap() {
  const msalInstance = new PublicClientApplication(msalConfig)

  // MSAL v3+ requires explicit async init before any other API is used.
  await msalInstance.initialize()

  // Complete a redirect sign-in if we're returning from one, and adopt that
  // account as active; otherwise fall back to the first cached account.
  const redirectResponse = await msalInstance.handleRedirectPromise()
  if (redirectResponse?.account) {
    msalInstance.setActiveAccount(redirectResponse.account)
  } else if (!msalInstance.getActiveAccount()) {
    const [firstAccount] = msalInstance.getAllAccounts()
    if (firstAccount) {
      msalInstance.setActiveAccount(firstAccount)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <DataProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </DataProvider>
        </QueryClientProvider>
      </MsalProvider>
    </StrictMode>,
  )
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err)
  const message = err instanceof Error ? err.message : String(err)
  const root = document.getElementById('root')
  if (root) {
    createRoot(root).render(
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0f1117',
          fontFamily: 'sans-serif',
        }}
      >
        <div className="error-state" style={{ maxWidth: '480px', width: '100%' }}>
          <p className="error-state__message">Couldn&apos;t start the dashboard</p>
          <p className="error-state__hint">
            Check the app configuration or refresh to try again.
          </p>
          <p className="error-state__hint" style={{ marginTop: '0.75rem', wordBreak: 'break-word' }}>
            {message}
          </p>
        </div>
      </div>,
    )
  }
})
