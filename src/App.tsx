import { Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { StorageOptimization } from './sections/StorageOptimization'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="*" element={<StorageOptimization />} />
      </Routes>
    </Layout>
  )
}

export default App
