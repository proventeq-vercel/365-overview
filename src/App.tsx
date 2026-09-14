import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { NoReports } from './app/NoReports'
import { SettingsProvider } from './app/SettingsProvider'
import { env } from './config/env'
import { enabledReports } from './features/registry'

function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
}

function App() {
  const reports = enabledReports(env.features)
  const fallback = reports[0]

  return (
    <SettingsProvider>
      <AppShell reports={reports}>
        <Routes>
          {reports.map((report) => (
            <Route key={report.id} path={report.path} element={<report.Component />} />
          ))}
          <Route
            path="*"
            element={fallback ? <RedirectKeepingQuery to={fallback.path} /> : <NoReports />}
          />
        </Routes>
      </AppShell>
    </SettingsProvider>
  )
}

export default App
