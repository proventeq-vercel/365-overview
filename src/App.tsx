import { Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { Overview } from './sections/Overview'
import { SharePoint } from './sections/SharePoint'
import { Licensing } from './sections/Licensing'
import { Estate } from './sections/Estate'
import { Exchange } from './sections/Exchange'
import { Azure } from './sections/Azure'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/sharepoint" element={<SharePoint />} />
        <Route path="/licensing" element={<Licensing />} />
        <Route path="/estate" element={<Estate />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/azure" element={<Azure />} />
      </Routes>
    </Layout>
  )
}

export default App
