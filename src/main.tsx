import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { getConfig } from './config/appConfig'
import { env } from './config/env'
import { MsalAuthProvider } from './auth/MsalAuthProvider'
import { queryClient } from './app/queryClient'
import { DataProvider } from './data/DataProvider'
import App from './App.tsx'
import './index.css'

function render(tree: ReactNode) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>{tree}</StrictMode>,
  )
}

const appTree = (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DataProvider>
  </QueryClientProvider>
)

function renderBootstrapError(err: unknown) {
  console.error('Bootstrap failed:', err)
  const message = err instanceof Error ? err.message : String(err)
  const root = document.getElementById('root')
  if (!root) return
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
        <p
          className="error-state__hint"
          style={{ marginTop: '0.75rem', wordBreak: 'break-word' }}
        >
          {message}
        </p>
      </div>
    </div>,
  )
}

function bootstrap() {
  if (env.useMock) {
    // Mock mode: no auth config, no MSAL. Keeps mock mode MSAL-free for
    // unit tests and Playwright e2e.
    render(appTree)
    return
  }

  // Live mode: validate the build-time auth config eagerly (so a missing VITE_*
  // var surfaces as a clear bootstrap error rather than a render crash), then
  // mount MSAL auth gating. The MSAL instance is initialized inside
  // MsalAuthProvider, and DataProvider's LiveDataProvider runs inside
  // MsalProvider so useMsal() works.
  getConfig()
  render(<MsalAuthProvider>{appTree}</MsalAuthProvider>)
}

try {
  bootstrap()
} catch (err) {
  renderBootstrapError(err)
}
