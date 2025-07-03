import { Routes, Route } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Products from './pages/Products'
import Stores from './pages/Stores'
import Sales from './pages/Sales'
import Refunds from './pages/Refunds'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import './App.css'

function App() {
  return (
    <div className="App">
      <Navigation />
      <Container fluid className="mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/products" element={<Products />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/refunds" element={<Refunds />} />
        </Routes>
      </Container>
    </div>
  )
}

export default App
