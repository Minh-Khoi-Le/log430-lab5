import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { RefundService } from '../services/api'

function Refunds() {
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRefunds()
  }, [])

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const userData = JSON.parse(localStorage.getItem('userData') || '{}')
      
      let data
      if (userData.role === 'client') {
        data = await RefundService.getUserRefunds(userData.id)
      } else {
        data = await RefundService.getRefunds()
      }
      
      setRefunds(data)
    } catch (error) {
      console.error('Error fetching refunds:', error)
    } finally {
      setLoading(false)
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
          <h1 className="mb-4">Refunds</h1>
        </Col>
        <Col xs="auto">
          <Button variant="primary">New Refund</Button>
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
                      <th>Original Sale</th>
                      <th>Store</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map(refund => (
                      <tr key={refund.id}>
                        <td>{refund.id}</td>
                        <td>{new Date(refund.date).toLocaleDateString()}</td>
                        <td>#{refund.saleId}</td>
                        <td>{refund.store?.name || `Store ${refund.storeId}`}</td>
                        <td>{refund.user?.name || `User ${refund.userId}`}</td>
                        <td>${refund.total.toFixed(2)}</td>
                        <td>{refund.reason || 'No reason provided'}</td>
                        <td>
                          <Button variant="outline-primary" size="sm">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {refunds.length === 0 && (
                <div className="text-center">
                  <p>No refunds found.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Refunds
