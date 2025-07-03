import { Container, Row, Col, Card } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SalesService, ProductService, StoreService, InventoryService } from '../services/api'

function Home() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalStores: 0,
    lowStock: 0
  })
  
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch basic stats
      const [sales, products, stores, inventory] = await Promise.all([
        SalesService.getSales(),
        ProductService.getProducts(),
        StoreService.getStores(),
        InventoryService.getInventory()
      ])

      setStats({
        totalSales: sales.length,
        totalProducts: products.length,
        totalStores: stores.length,
        lowStock: inventory.filter(item => item.quantity < 10).length
      })

      // Process sales data for chart
      const salesByMonth = sales.reduce((acc, sale) => {
        const month = new Date(sale.date).toLocaleDateString('en-US', { month: 'short' })
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {})

      setSalesData(
        Object.entries(salesByMonth).map(([month, count]) => ({
          month,
          sales: count
        }))
      )
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h1 className="mb-4">Dashboard</h1>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="dashboard-card">
            <Card.Body>
              <Card.Title>Total Sales</Card.Title>
              <Card.Text className="display-4">{stats.totalSales}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card success">
            <Card.Body>
              <Card.Title>Products</Card.Title>
              <Card.Text className="display-4">{stats.totalProducts}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card warning">
            <Card.Body>
              <Card.Title>Stores</Card.Title>
              <Card.Text className="display-4">{stats.totalStores}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card danger">
            <Card.Body>
              <Card.Title>Low Stock Items</Card.Title>
              <Card.Text className="display-4">{stats.lowStock}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <Card.Title>Sales Overview</Card.Title>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#0d6efd" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
