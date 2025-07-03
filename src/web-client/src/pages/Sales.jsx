import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { SalesService } from '../services/api'

function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      let data
      if (userData.role === 'client') {
        data = await SalesService.getUserSales(userData.id)
      } else {
        data = await SalesService.getSales()
      }
      
      setSales(data)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="success">Active</Badge>
      case 'refunded':
        return <Badge bg="danger">Refunded</Badge>
      case 'partially_refunded':
        return <Badge bg="warning">Partially Refunded</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="text-center">
          <div className="spinner-border">
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
          <h1 className="mb-4">Sales</h1>
        </Col>
        <Col xs="auto">
          <Button variant="primary">New Sale</Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Store</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td>{sale.id}</td>
                        <td>{new Date(sale.date).toLocaleDateString()}</td>
                        <td>{sale.store?.name || `Store ${sale.storeId}`}</td>
                        <td>{sale.user?.name || `User ${sale.userId}`}</td>
                        <td>${sale.total.toFixed(2)}</td>
                        <td>{getStatusBadge(sale.status)}</td>
                        <td>
                          <Button variant="outline-primary" size="sm" className="me-2">
                            View
                          </Button>
                          {sale.status === 'active' && (
                            <Button variant="outline-warning" size="sm">
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {sales.length === 0 && (
                <div className="text-center">
                  <p>No sales found.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Sales
