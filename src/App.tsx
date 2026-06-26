import { Route, Routes } from 'react-router-dom'
import { LoginGate } from './app/LoginGate'
import { Layout } from './app/Layout'
import './App.css'

// Lightweight placeholders. Task 12 replaces each body with the real section
// page; keeping them as named components makes those swaps a one-line change.
function OverviewPage() {
  return (
    <section className="page">
      <h1 className="page__title">Overview</h1>
    </section>
  )
}
function SharePointPage() {
  return (
    <section className="page">
      <h1 className="page__title">SharePoint</h1>
    </section>
  )
}
function LicensingPage() {
  return (
    <section className="page">
      <h1 className="page__title">Licensing</h1>
    </section>
  )
}
function EstatePage() {
  return (
    <section className="page">
      <h1 className="page__title">Estate</h1>
    </section>
  )
}
function ExchangePage() {
  return (
    <section className="page">
      <h1 className="page__title">Exchange</h1>
    </section>
  )
}
function AzurePage() {
  return (
    <section className="page">
      <h1 className="page__title">Azure</h1>
    </section>
  )
}

function App() {
  return (
    <LoginGate>
      <Layout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/sharepoint" element={<SharePointPage />} />
          <Route path="/licensing" element={<LicensingPage />} />
          <Route path="/estate" element={<EstatePage />} />
          <Route path="/exchange" element={<ExchangePage />} />
          <Route path="/azure" element={<AzurePage />} />
        </Routes>
      </Layout>
    </LoginGate>
  )
}

export default App
