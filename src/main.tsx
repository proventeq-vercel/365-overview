import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { env } from './config/env'
import { MsalAuthProvider } from './auth/MsalAuthProvider'
import { AppIntlProvider } from './app/AppIntlProvider'
import { BootstrapError } from './app/BootstrapError'
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
    <AppIntlProvider>
      <BootstrapError message={message} overridden={Object.keys(env.overrides).length > 0} />
    </AppIntlProvider>,
  )
}

function bootstrap() {
  if (!env.usesMsal) {
    render(<AppIntlProvider>{appTree}</AppIntlProvider>)
    return
  }

  render(
    <AppIntlProvider>
      <MsalAuthProvider>{appTree}</MsalAuthProvider>
    </AppIntlProvider>,
  )
}

try {
  bootstrap()
} catch (err) {
  renderBootstrapError(err)
}
