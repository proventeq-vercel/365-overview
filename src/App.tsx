import { Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { NoReports } from './app/NoReports'
import { SettingsProvider } from './app/SettingsProvider'
import { env } from './config/env'
import { enabledReports } from './features/registry'

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
          <Route path="*" element={fallback ? <fallback.Component /> : <NoReports />} />
        </Routes>
      </AppShell>
    </SettingsProvider>
  )
}

export default App
