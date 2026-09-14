import { Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { ProductStorageOptimization } from './product/ProductStorageOptimization'
import { StorageOptimization } from './sections/StorageOptimization'

function App() {
  return (
    <Routes>
      <Route path="/product/*" element={<ProductStorageOptimization />} />
      <Route
        path="*"
        element={
          <Layout>
            <StorageOptimization />
          </Layout>
        }
      />
    </Routes>
  )
}

export default App
