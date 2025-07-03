import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { StoreService } from '../services/api'

function Stores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      setLoading(true)
      const data = await StoreService.getStores()
      setStores(data)
    } catch (error) {
      console.error('Error fetching stores:', error)
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
          <h1 className="mb-4">Stores</h1>
        </Col>
        <Col xs="auto">
          <Button variant="primary">Add Store</Button>
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
                      <th>Name</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map(store => (
                      <tr key={store.id}>
                        <td>{store.id}</td>
                        <td>{store.name}</td>
                        <td>{store.address || 'No address'}</td>
                        <td>
                          <Button variant="outline-primary" size="sm" className="me-2">
                            Edit
                          </Button>
                          <Button variant="outline-danger" size="sm">
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {stores.length === 0 && (
                <div className="text-center">
                  <p>No stores found.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Stores
