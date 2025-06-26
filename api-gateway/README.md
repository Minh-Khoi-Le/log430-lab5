# Load Balanced API Gateway - LOG430 Lab 5

This directory contains the Kong API Gateway configuration for the LOG430 microservices architecture with **load balancing enabled by default** for optimal performance and reliability.

## Overview

The API Gateway is configured to run in **load-balanced mode by default**, providing:

**Core Gateway Features:**

- **Centralized routing** to all backend services
- **CORS configuration** for web client support
- **Rate limiting** and security features
- **API key management** for access control
- **Metrics collection** via Prometheus integration

**Load Balancing (Default Configuration):**

- **Multiple service instances** for critical services
- **Automatic load distribution** using round-robin algorithm
- **Health checks** with automatic failover
- **High availability** and fault tolerance
- **Performance optimization** through load distribution

**Advanced Features:**

- **JWT authentication** support at gateway level
- **Request/Response transformation** capabilities
- **Enhanced security** with IP restrictions and bot detection
- **Centralized logging** with structured JSON format
- **Service discovery** and upstream monitoring

**Security & Monitoring:**

- **Enhanced security headers** (HSTS, CSP, XSS protection)
- **Advanced rate limiting** with Redis backend
- **Bot detection and filtering**
- **Comprehensive monitoring** with Prometheus and Grafana
- **Request/response logging** and audit trails

## Load Balanced Architecture (Default)

```
Frontend Client (Port 5173)
        ↓
Kong API Gateway (Port 8000)
        ↓
┌─────────────────────────────────────────────────────┐
│ Load Balanced Services (Multiple Instances)        │
├─────────────────────────────────────────────────────┤
│ • Product Service: 2 instances (ports 3001, 3011)  │
│ • Stock Service: 2 instances (ports 3004, 3014)    │
│ • Cart Service: 2 instances (ports 3007, 3017)     │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│ Single Instance Services                            │
├─────────────────────────────────────────────────────┤
│ • User Service (port 3002)                         │
│ • Store Service (port 3003)                        │
│ • Sales Service (port 3005)                        │
│ • Refund Service (port 3006)                       │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│ Shared Infrastructure                               │
├─────────────────────────────────────────────────────┤
│ • PostgreSQL Database                               │
│ • Redis Cache                                       │
│ • Prometheus Monitoring                             │
│ • Grafana Dashboards                                │
└─────────────────────────────────────────────────────┘
```

Kong API Gateway (Port 8000)
↓
Load Balancer
↓
┌─────────────────────────────────────┐
│ Microservices │
├─────────────────────────────────────┤
│ • Product Service (Port 3001) │
│ • User Service (Port 3002) │
│ • Store Service (Port 3003) │
│ • Stock Service (Port 3004) │
│ • Sales Service (Port 3005) │
│ • Refund Service (Port 3006) │
│ • Cart Service (Port 3007) │
└─────────────────────────────────────┘

```

## Files

### Core Configuration
- **`kong.yml`** - Kong declarative configuration with services, routes, and plugins
- **`Dockerfile`** - Kong container configuration
- **`docker-compose.gateway.yml`** - Complete orchestration with gateway + microservices
- **`prometheus.yml`** - Metrics collection configuration

### Directory Structure
```

api-gateway/
├── kong.yml # Kong configuration
├── Dockerfile # Kong container setup
├── docker-compose.gateway.yml # Full stack orchestration

### Load Balanced Configuration Files

- **`docker-compose.loadbalanced.yml`** - Load balanced deployment with multiple service instances
- **`prometheus-loadbalanced.yml`** - Enhanced metrics configuration for load balancing
- **`start-loadbalanced.bat`** - Script to start load balanced deployment
- **`test-loadbalancing.bat`** - Load balancing validation script
- **`test-jwt-features.bat`** - Advanced features testing script

````

## Services & Routes

The gateway routes requests to the following microservices:

| Route Path | Service | Description |
|------------|---------|-------------|
| `/api/products/*` | Product Service | Product catalog and management |
| `/api/auth/*` | User Service | Authentication endpoints |
| `/api/users/*` | User Service | User management |
| `/api/stores/*` | Store Service | Store locations and management |
| `/api/stock/*` | Stock Service | Inventory management |
| `/api/sales/*` | Sales Service | Order processing |
| `/api/refunds/*` | Refund Service | Return processing |
| `/api/cart/*` | Cart Service | Shopping cart operations |

## Gateway Features

### Security
- **CORS Configuration**: Allows requests from frontend applications
- **Rate Limiting**: 100 requests/minute, 1000 requests/hour per client
- **Request Size Limiting**: Maximum 10MB payload size
- **API Key Authentication**: Consumer-based access control

### Monitoring
- **Prometheus Integration**: Metrics collection for all requests
- **Custom Metrics**: Latency, throughput, error rates
- **Health Checks**: Gateway and service health monitoring
- **Centralized Logging**: Request/response logging

### Performance
- **Connection Pooling**: Efficient backend connections
- **Request/Response Buffering**: Optimized data handling
- **Service Discovery**: Automatic service endpoint resolution

## API Keys

Pre-configured API keys for different client types:

| Consumer | API Key | Usage |
|----------|---------|-------|
| `frontend-app` | `frontend-app-key-12345` | Web application |
| `mobile-app` | `mobile-app-key-67890` | Mobile applications |
| `admin-dashboard` | `admin-dashboard-key-abcde` | Admin interface |
| `testing-client` | `testing-key-xyz123` | Development/testing |

**Usage**: Include the API key in requests:
```bash
curl -H "X-API-Key: frontend-app-key-12345" http://localhost:8000/api/products
````

## Quick Start (Load Balanced by Default)

### Option 1: Interactive Quick Start

```bash
# Use the interactive menu for easy setup
quick-start.bat
```

### Option 2: Direct Commands

#### 1. Start Load Balanced Gateway

```bash
# Navigate to api-gateway directory
cd api-gateway

# Start the complete load balanced stack (DEFAULT)
start-gateway.bat

# This starts:
# - Kong API Gateway
# - 2 Product Service instances (load balanced)
# - 2 Stock Service instances (load balanced)
# - 2 Cart Service instances (load balanced)
# - Single instances of User, Store, Sales, Refund services
# - PostgreSQL, Redis, Prometheus, Grafana
```

#### 2. Verify Load Balanced Gateway is Working

```bash
# Test gateway health
curl http://localhost:8001/status

# Test load balancing with multiple requests
test-gateway.bat

# Run comprehensive load balancing tests
test-loadbalancing.bat

# Check Kong upstreams (load balancer configuration)
curl http://localhost:8001/upstreams
```

#### 3. Access Monitoring & Management

- **Gateway API**: <http://localhost:8000>
- **Kong Admin**: <http://localhost:8001>
- **Prometheus**: <http://localhost:9090>
- **Grafana**: <http://localhost:3100> (admin/admin)

#### 4. Stop Everything

```bash
# Stop all services
stop-gateway.bat
```

## Gateway Ports

| Port | Service          | Description               |
| ---- | ---------------- | ------------------------- |
| 8000 | Kong Proxy       | Main API Gateway entrance |
| 8001 | Kong Admin       | Gateway management API    |
| 8443 | Kong HTTPS Proxy | SSL/TLS gateway (future)  |
| 8444 | Kong HTTPS Admin | SSL/TLS admin (future)    |

## Service Ports (Behind Gateway)

| Port | Service         | Access                                                 |
| ---- | --------------- | ------------------------------------------------------ |
| 3001 | Product Service | Direct: localhost:3001, Gateway: /api/products         |
| 3002 | User Service    | Direct: localhost:3002, Gateway: /api/auth, /api/users |
| 3003 | Store Service   | Direct: localhost:3003, Gateway: /api/stores           |
| 3004 | Stock Service   | Direct: localhost:3004, Gateway: /api/stock            |
| 3005 | Sales Service   | Direct: localhost:3005, Gateway: /api/sales            |
| 3006 | Refund Service  | Direct: localhost:3006, Gateway: /api/refunds          |
| 3007 | Cart Service    | Direct: localhost:3007, Gateway: /api/cart             |

## Usage Examples

### Authentication Flow

```bash
# 1. Login through gateway
curl -X POST http://localhost:8000/api/auth/login \
  -H "X-API-Key: frontend-app-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Use JWT token for protected endpoints
curl -H "X-API-Key: frontend-app-key-12345" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/users/profile
```

### Product Operations

```bash
# Get all products
curl -H "X-API-Key: frontend-app-key-12345" \
     http://localhost:8000/api/products

# Search products
curl -H "X-API-Key: frontend-app-key-12345" \
     http://localhost:8000/api/products/search?q=laptop
```

### Cart Operations

```bash
# Add item to cart
curl -X POST http://localhost:8000/api/cart/items \
  -H "X-API-Key: frontend-app-key-12345" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'
```

## Configuration Management

### Environment Variables

Key environment variables for gateway configuration:

```bash
# Kong Configuration
KONG_DATABASE=off
KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml
KONG_PROXY_LISTEN=0.0.0.0:8000
KONG_ADMIN_LISTEN=0.0.0.0:8001
KONG_LOG_LEVEL=info
KONG_PLUGINS=bundled,prometheus

# Service URLs (automatically configured in Docker Compose)
PRODUCT_SERVICE_URL=http://product-service:3001
USER_SERVICE_URL=http://user-service:3002
# ... etc
```

### Updating Configuration

To update gateway configuration:

1. Modify `kong.yml`
2. Restart the gateway:

```bash
docker-compose -f docker-compose.gateway.yml restart kong
```

## Monitoring & Observability

### Prometheus Metrics

The gateway exposes metrics at: <http://localhost:8001/metrics>

Key metrics include:

- `kong_http_requests_total` - Total requests
- `kong_request_latency_seconds` - Request latency
- `kong_upstream_latency_seconds` - Backend latency
- `kong_bandwidth_bytes` - Data transfer

### Grafana Dashboards

Access Grafana at <http://localhost:3100> with admin/admin

Pre-configured dashboards show:

- Gateway request volume and latency
- Service health and performance
- Error rates by service
- API usage by consumer

### Logging

Gateway logs are available via Docker:

```bash
# View gateway logs
docker logs kong-gateway -f

# View all service logs
docker-compose -f docker-compose.gateway.yml logs -f
```

## Troubleshooting

### Common Issues

1. **Gateway not starting**

   ```bash
   # Check Kong configuration
   docker run --rm -v $(pwd)/kong.yml:/kong.yml kong:3.4.2-alpine kong config parse /kong.yml
   ```

2. **Service not reachable**

   ```bash
   # Check service health through gateway
   curl http://localhost:8001/services/product-service/health

   # Check direct service health
   curl http://localhost:3001/health
   ```

3. **Authentication issues**

   ```bash
   # Verify API key is configured
   curl http://localhost:8001/consumers/frontend-app/key-auth
   ```

### Health Checks

```bash
# Gateway health
curl http://localhost:8001/status

# All services health
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products/health
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users/health
# ... repeat for all services
```

## Phase 3.2 & 3.3 - Advanced Features

### Load Balancing Architecture (Phase 3.3)

```text
Client Applications
        ↓
   Kong API Gateway (Port 8000)
        ↓
    Upstream Load Balancers
        ↓
┌─────────────────────────────────────────────┐
│            Load Balanced Services           │
├─────────────────────────────────────────────┤
│ Product Service: 2 instances (3001, 3011)  │
│ Stock Service: 2 instances (3004, 3014)    │
│ Cart Service: 2 instances (3007, 3017)     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│            Single Instance Services         │
├─────────────────────────────────────────────┤
│ • User Service (Port 3002)                 │
│ • Store Service (Port 3003)                │
│ • Sales Service (Port 3005)                │
│ • Refund Service (Port 3006)               │
└─────────────────────────────────────────────┘
```

### Advanced Security Features (Phase 3.2)

- **JWT Authentication**: Gateway-level JWT token validation
- **Consumer ACL Groups**: Role-based access control (frontend-users, mobile-users, admin-users)
- **Advanced Rate Limiting**: Per-consumer and per-route rate limits
- **IP Restrictions**: Allowlist-based IP filtering
- **Bot Detection**: Automated bot filtering and blocking
- **Request/Response Transformation**: Header injection and modification
- **Enhanced CORS**: Production-ready cross-origin configuration

### Load Balancing Features (Phase 3.3)

- **Round-Robin Distribution**: Equal request distribution across instances
- **Active Health Checks**: HTTP health checks every 30 seconds
- **Passive Health Monitoring**: Automatic failure detection
- **Automatic Failover**: Remove unhealthy instances from rotation
- **Upstream Monitoring**: Real-time health and performance metrics
- **Weighted Distribution**: Configurable instance weights

### Deployment Options

#### Option 1: Basic Gateway (Phase 3.1)

```bash
# Start basic gateway with single service instances
start-gateway.bat
```

#### Option 2: Load Balanced Gateway (Phase 3.2 & 3.3)

```bash
# Start advanced gateway with load balancing
start-loadbalanced.bat
```

### Load Balanced Services Configuration

| Service         | Instances | Ports      | Upstream Name            |
| --------------- | --------- | ---------- | ------------------------ |
| Product Service | 2         | 3001, 3011 | product-service-upstream |
| Stock Service   | 2         | 3004, 3014 | stock-service-upstream   |
| Cart Service    | 2         | 3007, 3017 | cart-service-upstream    |

### Testing Features

#### Load Balancing Tests

```bash
# Test load balancing distribution
test-loadbalancing.bat

# Verify upstream health
curl http://localhost:8001/upstreams/product-service-upstream/health
```

#### Advanced Features Tests

```bash
# Test JWT and security features
test-jwt-features.bat

# Test API key authentication
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products
```

## Next Steps (Phase 3.2 & 3.3)

1. **Load Balancing Configuration**

   - Implement upstream load balancers
   - Configure multiple service instances
   - Set up health checks and failover

2. **Enhanced Security**

   - JWT validation at gateway level
   - Request/response transformation
   - Advanced rate limiting rules

3. **Performance Optimization**
   - Response caching
   - Request/response compression
   - Connection pooling optimization

## Phase 4: Security and Access Management

### Gateway Security (Phase 4.1)

#### Enhanced Security Features

- **Security Headers**: HSTS, CSP, XSS Protection, Frame Options
- **Advanced Rate Limiting**: Redis-backed with fault tolerance
- **Bot Detection**: User-agent filtering and blacklisting
- **Request Protection**: Size limiting, payload validation
- **IP Security**: Allowlist/blocklist management
- **CORS Enhancement**: Strict origin validation and credential handling

#### Security Scripts

```bash
# Apply comprehensive security configuration
apply-security-config.bat

# Test all security features
test-security-features.bat
```

### Inter-Service Communication Security (Phase 4.2)

#### Internal Security Infrastructure

- **Service Discovery**: Consul for dynamic service registration
- **Secret Management**: Vault for secure credential storage
- **Internal Gateway**: Dedicated Kong instance for service-to-service communication
- **Service Authentication**: Token-based identity verification
- **Network Isolation**: Separate internal networks for enhanced security

#### Internal Security Scripts

```bash
# Start internal security stack (Consul + Vault + Internal Kong)
start-internal-security.bat

# Initialize Vault with service secrets
init-vault-secrets.bat

# Test internal security features
test-internal-security.bat
```

#### Internal Security Ports

| Port | Service             | Description                                    |
| ---- | ------------------- | ---------------------------------------------- |
| 8500 | Consul              | Service discovery and health checks            |
| 8200 | Vault               | Secret management and storage                  |
| 8002 | Kong Internal       | Internal API gateway for service communication |
| 8003 | Kong Internal Admin | Internal gateway management                    |

### Security Testing

#### Gateway Security Tests

```bash
# API Key Authentication
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products

# Rate Limiting Test
for /l %i in (1,1,10) do curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products

# Security Headers Check
curl -I -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products

# Bot Detection Test
curl -H "User-Agent: Googlebot/2.1" -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products
```

#### Internal Security Tests

```bash
# Service Discovery
curl http://localhost:8500/v1/agent/services

# Secret Retrieval
curl -H "X-Vault-Token: dev-root-token" http://localhost:8200/v1/secret/data/product-service

# Internal Service Communication
curl -H "X-Internal-Token: internal-service-token" -H "X-Service-ID: product-service" http://localhost:8002/internal/users
```

### Security Monitoring

#### Security Metrics

- **Authentication Failures**: Failed API key and JWT validations
- **Rate Limiting**: Request throttling and blocking statistics
- **Security Events**: Bot detection, IP blocking, request termination
- **Internal Communication**: Service-to-service authentication and authorization

#### Access Security Dashboards

- **Prometheus Security Metrics**: <http://localhost:9090/graph>
- **Consul Service Health**: <http://localhost:8500/ui/>
- **Vault Secret Management**: <http://localhost:8200/ui/>
- **Kong Gateway Metrics**: <http://localhost:8001/status>

## Complete Deployment Options

### Standard Gateway with Security (Recommended)

```bash
# 1. Start gateway with all security features
start-gateway.bat
apply-security-config.bat

# 2. Start internal security infrastructure
start-internal-security.bat
init-vault-secrets.bat

# 3. Test complete security setup
test-security-features.bat
test-internal-security.bat
```

### Load Balanced with Advanced Security

```bash
# 1. Start load balanced services with security
start-loadbalanced.bat
apply-security-config.bat

# 2. Start internal security stack
start-internal-security.bat
init-vault-secrets.bat

# 3. Comprehensive testing
test-loadbalancing.bat
test-security-features.bat
test-internal-security.bat
```
