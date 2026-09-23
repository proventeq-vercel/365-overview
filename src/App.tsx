import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { NoReports } from './app/NoReports'
import { SettingsProvider } from './app/SettingsProvider'
import { env } from './config/env'
import { FeatureFlags } from './config/featureFlags'
import { enabledReports } from './features/registry'

function HomeRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/', search }} replace />
}

function App() {
  const reports = enabledReports(env.features)
  const fallback = reports[0]

  return (
    <SettingsProvider>
      <AppShell reports={reports} menuEnabled={env.features.has(FeatureFlags.AppReportMenu)}>
        <Routes>
          <Route path="/" element={fallback ? <fallback.Component /> : <NoReports />} />
          {reports.map((report) => (
            <Route key={report.id} path={report.path} element={<report.Component />} />
          ))}
          <Route path="*" element={fallback ? <HomeRedirect /> : <NoReports />} />
        </Routes>
      </AppShell>
    </SettingsProvider>
  )
}

export default App
