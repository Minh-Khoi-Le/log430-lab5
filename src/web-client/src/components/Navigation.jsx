import { Navbar, Nav, Container } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import { useState, useEffect } from 'react'

function Navigation() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('userData')
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container fluid>
        <LinkContainer to="/">
          <Navbar.Brand>Retail System</Navbar.Brand>
        </LinkContainer>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Dashboard</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/products">
              <Nav.Link>Products</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/stores">
              <Nav.Link>Stores</Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/inventory">
              <Nav.Link>Inventory</Nav.Link>
            </LinkContainer>
            
            {user && user.role === 'client' && (
              <>
                <LinkContainer to="/sales">
                  <Nav.Link>My Sales</Nav.Link>
                </LinkContainer>
                
                <LinkContainer to="/refunds">
                  <Nav.Link>My Refunds</Nav.Link>
                </LinkContainer>
              </>
            )}
            
            {user && user.role === 'admin' && (
              <>
                <LinkContainer to="/sales">
                  <Nav.Link>All Sales</Nav.Link>
                </LinkContainer>
                
                <LinkContainer to="/refunds">
                  <Nav.Link>All Refunds</Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>
          
          <Nav>
            {user ? (
              <>
                <Nav.Link disabled>
                  Welcome, {user.name} ({user.role})
                </Nav.Link>
                <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
                  Logout
                </Nav.Link>
              </>
            ) : (
              <LinkContainer to="/login">
                <Nav.Link>Login</Nav.Link>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation
