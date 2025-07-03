import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { InventoryService } from '../services/api'

function Inventory() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const data = await InventoryService.getInventory()
      setInventory(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { variant: 'danger', text: 'Out of Stock' }
    if (quantity < 10) return { variant: 'warning', text: 'Low Stock' }
    return { variant: 'success', text: 'In Stock' }
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
          <h1 className="mb-4">Inventory</h1>
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
                      <th>Store</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => {
                      const status = getStockStatus(item.quantity)
                      return (
                        <tr key={`${item.storeId}-${item.productId}`}>
                          <td>{item.store?.name || `Store ${item.storeId}`}</td>
                          <td>{item.product?.name || `Product ${item.productId}`}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <Badge bg={status.variant}>{status.text}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
              
              {inventory.length === 0 && (
                <div className="text-center">
                  <p>No inventory data found.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Inventory
