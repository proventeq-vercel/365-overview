import { Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { SettingsProvider } from './app/SettingsProvider'
import { DEFAULT_REPORT, REPORTS } from './features/registry'

function App() {
  return (
    <SettingsProvider>
      <AppShell>
        <Routes>
          {REPORTS.map((report) => (
            <Route key={report.id} path={report.path} element={<report.Component />} />
          ))}
          <Route path="*" element={<DEFAULT_REPORT.Component />} />
        </Routes>
      </AppShell>
    </SettingsProvider>
  )
}

export default App
