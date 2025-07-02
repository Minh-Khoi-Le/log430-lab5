# LOG430 - Multi-Store Microservices Architecture

## Table of Contents

- [LOG430 - Multi-Store Microservices Architecture](#log430---multi-store-microservices-architecture)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Architecture Overview](#architecture-overview)
  - [Technical Choices](#technical-choices)
  - [Quick Start](#quick-start)
    - [Choose Your Deployment Method](#choose-your-deployment-method)
    - [Docker Compose (Recommended for Development)](#docker-compose-recommended-for-development)
    - [Kubernetes (Production-like)](#kubernetes-production-like)
    - [Quick Commands](#quick-commands)
      - [Docker Deployment](#docker-deployment)
      - [Kubernetes Deployment](#kubernetes-deployment)
    - [Access Points (Both Deployments)](#access-points-both-deployments)
    - [All Scripts Organized](#all-scripts-organized)
    - [**What Gets Started**](#what-gets-started)
    - [Prerequisites](#prerequisites)
    - [Option 1: Microservices with API Gateway (Recommended)](#option-1-microservices-with-api-gateway-recommended)
    - [Option 2: With Internal Security (Advanced)](#option-2-with-internal-security-advanced)
    - [Option 3: Load Balanced Services](#option-3-load-balanced-services)
    - [With Kong API Gateway (Recommended)](#with-kong-api-gateway-recommended)
    - [To stop all services](#to-stop-all-services)
    - [Manual Start](#manual-start)
  - [Microservices Deployment](#microservices-deployment)
    - [Individual Service Ports](#individual-service-ports)
    - [Service Health Checks](#service-health-checks)
    - [Database and Cache](#database-and-cache)
  - [API Gateway](#api-gateway)
    - [Gateway Endpoints](#gateway-endpoints)
    - [Security Features](#security-features)
  - [Testing](#testing)
    - [API Testing](#api-testing)
    - [Load Testing](#load-testing)
  - [Load Balancing](#load-balancing)
    - [Architecture](#architecture)
    - [Implementation Details](#implementation-details)
    - [Testing Load Balancing](#testing-load-balancing)
  - [Caching](#caching)
    - [Redis Implementation](#redis-implementation)
    - [Cached Endpoints](#cached-endpoints)
  - [Monitoring](#monitoring)
    - [Accessing Monitoring Tools](#accessing-monitoring-tools)
      - [With Docker Compose](#with-docker-compose)
      - [With Kubernetes](#with-kubernetes)
    - [Key Metrics](#key-metrics)
    - [Monitoring During Load Tests](#monitoring-during-load-tests)
  - [Data Management](#data-management)
    - [Default Data Injection](#default-data-injection)
    - [Database Commands](#database-commands)
  - [Project Structure](#project-structure)
  - [Additional Documentation](#additional-documentation)

## Description

This application demonstrates a complete migration from monolithic to microservices architecture for a multi-store management system. The project includes:

- **7 Core Microservices**: Product, User, Store, Stock, Sales, Refund, and Cart services
- **API Gateway**: Kong-based gateway with advanced routing, security, and load balancing
- **React Frontend**: Modern web interface with Vite build system
- **Complete Security**: Authentication, authorization, and inter-service communication security
- **Monitoring & Observability**: Prometheus and Grafana integration
- **Service Discovery**: Consul for dynamic service registration
- **Secret Management**: Vault for secure credential storage

## Architecture Overview

```
Frontend (React) → API Gateway (Kong) → Microservices
                        ↓
                 Load Balancing & Security
                        ↓
    ┌─────────────────────────────────────────────────┐
    │              Microservices                      │
    ├─────────────────────────────────────────────────┤
    │ • Product Service (3001) - Catalog management  │
    │ • User Service (3002) - Authentication        │
    │ • Store Service (3003) - Store operations     │
    │ • Stock Service (3004) - Inventory management │
    │ • Sales Service (3005) - Transaction handling │
    │ • Refund Service (3006) - Return processing   │
    │ • Cart Service (3007) - Shopping cart         │
    └─────────────────────────────────────────────────┘
                        ↓
            Internal Security & Service Mesh
    ┌─────────────────────────────────────────────────┐
    │ • Consul (Service Discovery)                    │
    │ • Vault (Secret Management)                     │
    │ • Internal Kong (Inter-service communication)  │
    │ • PostgreSQL (Shared Database)                 │
    │ • Redis (Caching & Sessions)                   │
    └─────────────────────────────────────────────────┘
```

## Technical Choices

**Frontend**: React with Vite, Material UI
**Backend**: Node.js microservices with Express
**API Gateway**: Kong with advanced routing and security
**Database**: PostgreSQL with Prisma ORM
**Caching**: Redis for sessions and performance
**Monitoring**: Prometheus + Grafana
**Security**: JWT, API Keys, OAuth, service mesh security
**Service Discovery**: Consul
**Secret Management**: HashiCorp Vault
**Containerization**: Docker with Docker Compose

Persistence: Prisma ORM / PostgreSQL

Caching: Redis for API response caching

Containerization: Docker Compose (client/server/db)

Orchestration: Kubernetes with Minikube

## Quick Start

### Choose Your Deployment Method

```bash
# Interactive deployment selector
scripts\quick-start.bat
```

This will present you with two deployment options:

### Docker Compose (Recommended for Development)

- **Fast setup** - Get running in minutes
- **Local development** - Easy to modify and test
- **Resource friendly** - Lower resource usage

### Kubernetes (Production-like)

- **Production environment** - Similar to real deployment
- **Advanced features** - Auto-scaling, health checks, rolling updates
- **Minikube required** - Local Kubernetes cluster

### Quick Commands

#### Docker Deployment

```bash
# Interactive Docker menu
scripts\docker\quick-start-docker.bat

# Or direct commands
scripts\docker\start-gateway.bat      # Start backend services
scripts\docker\start-frontend.bat     # Start frontend
```

#### Kubernetes Deployment

```bash
# Interactive Kubernetes menu
scripts\kubernetes\quick-start-k8s.bat

# Or step-by-step
scripts\kubernetes\setup-minikube.bat    # Setup environment
scripts\kubernetes\deploy-k8s.bat        # Deploy services
scripts\kubernetes\port-forward-all.bat  # Access services
```

### Access Points (Both Deployments)

When running, access the system at:

- **Frontend**: <http://localhost:3000>
- **API Gateway**: <http://localhost:8000>
- **Grafana**: <http://localhost:3001>
- **Prometheus**: <http://localhost:9090>

### All Scripts Organized

Scripts are now organized by deployment type:

| Deployment | Location | Description |
|------------|----------|-------------|
| **Docker** | `scripts\docker\` | Docker Compose scripts and quick start |
| **Kubernetes** | `scripts\kubernetes\` | Kubernetes deployment and management |
| **Main Menu** | `scripts\quick-start.bat` | Deployment type selector |

**Detailed Guide**: See `scripts\README.md` for complete documentation

### **What Gets Started**

- **Load Balanced Services**: Product, Stock, Cart (2 instances each)
- **Single Instance Services**: User, Store, Sales, Refund
- **Infrastructure**: PostgreSQL, Redis, Kong Gateway
- **Monitoring**: Prometheus (9090), Grafana (3100)
- **Frontend**: React app (5173)

### Prerequisites

- **Docker & Docker Compose** installed
- **Node.js 18+** (for local development)
- **curl** (for testing APIs)

### Option 1: Microservices with API Gateway (Recommended)

1. **Start the complete microservices stack:**

   ```bash
   cd services
   docker-compose -f docker-compose.microservices.yml up --build -d
   ```

2. **Start the API Gateway with security:**

   ```bash
   cd api-gateway
   start-gateway.bat
   apply-security-config.bat
   ```

3. **Access the application:**
   - **Frontend**: <http://localhost:5173>
   - **API Gateway**: <http://localhost:8000>
   - **Kong Admin**: <http://localhost:8001>
   - **Prometheus**: <http://localhost:9090>
   - **Grafana**: <http://localhost:3100> (admin/admin)

### Option 2: With Internal Security (Advanced)

1. **Start microservices and API Gateway** (as above)

2. **Start internal security infrastructure:**

   ```bash
   cd api-gateway
   start-internal-security.bat
   init-vault-secrets.bat
   ```

3. **Additional security services:**
   - **Consul**: <http://localhost:8500> (Service Discovery)
   - **Vault**: <http://localhost:8200> (Secret Management)

### Option 3: Load Balanced Services

1. **Start load balanced microservices:**

   ```bash
   cd api-gateway
   start-loadbalanced.bat
   ```

2. **Test load balancing:**

   ```bash
   test-loadbalancing.bat
   ```

### With Kong API Gateway (Recommended)
To start the entire system with Kong API Gateway providing load balancing:

```
scripts\start-with-kong.bat
```

This will:
1. Start all microservices
2. Start Kong API Gateway with load balancing
3. Start the frontend client

### To stop all services
To stop all running services and clean up resources:

```
scripts\stop-all-services.bat
```

### Manual Start
If you prefer to start services individually:

1. Start the backend services:
   ```
   docker-compose up -d
   ```

2. Start Kong API Gateway:
   ```
   scripts\docker\start-kong-simple.bat
   ```

3. Start the frontend:
   ```
   scripts\docker\start-frontend.bat
   ```

## Access Points

- **Frontend**: http://localhost:5173 (or the port shown in the frontend window)
- **API Gateway**: http://localhost:8000
- **API Admin**: http://localhost:8001

### Services via API Gateway
- Products: http://localhost:8000/products
- Users: http://localhost:8000/users
- Auth: http://localhost:8000/auth
- Stores: http://localhost:8000/stores
- Stock: http://localhost:8000/stock
- Sales: http://localhost:8000/sales
- Cart: http://localhost:8000/cart

## Microservices Deployment

### Individual Service Ports

| Service         | Port | Description                        |
| --------------- | ---- | ---------------------------------- |
| Product Service | 3001 | Product catalog and management     |
| User Service    | 3002 | Authentication and user management |
| Store Service   | 3003 | Store information and operations   |
| Stock Service   | 3004 | Inventory and stock management     |
| Sales Service   | 3005 | Transaction processing             |
| Refund Service  | 3006 | Return and refund processing       |
| Cart Service    | 3007 | Shopping cart operations           |

### Service Health Checks

Each microservice provides health check endpoints:

```bash
# Check individual service health
curl http://localhost:3001/health  # Product Service
curl http://localhost:3002/health  # User Service
curl http://localhost:3003/health  # Store Service
# ... etc
```

### Database and Cache

- **PostgreSQL**: Port 5432 (shared database)
- **Redis**: Port 6379 (caching and sessions)

## API Gateway

The Kong API Gateway provides:

- **Unified API Access**: Single entry point for all services
- **Load Balancing**: Automatic distribution across service instances
- **Security**: JWT authentication, API keys, rate limiting
- **Monitoring**: Prometheus metrics and health checks

### Gateway Endpoints

All services are accessible through the gateway:

```bash
# Via API Gateway (recommended)
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/users
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/stores
```

### Security Features

- **API Key Authentication**: Required for all external requests
- **JWT Token Support**: For authenticated users
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **CORS Protection**: Secure cross-origin requests
- **Security Headers**: HSTS, CSP, XSS protection

## Testing

### API Testing

```bash
# Test API Gateway security
cd api-gateway
test-security-features.bat

# Test JWT authentication
test-jwt-features.bat

# Test load balancing
test-loadbalancing.bat

# Test internal security
test-internal-security.bat
```

### Load Testing

```bash
# Test cache performance
cd scripts
test-cache-performance.bat

# Run k6 load tests
run-k6-tests.bat
```

scripts\cleanup-k8s.bat

## Local Development

```bash
# To run the server
cd server
npm run start
```

```bash
# To run the web application
cd client
npm run dev
```

## Load Balancing

The application implements load balancing using Kubernetes native capabilities.

### Architecture

```text
                                  ┌──────────────┐
                                  │              │
                               ┌──┤  Server Pod 1│
                               │  │              │
┌──────────────┐  ┌─────────┐  │  └──────────────┘
│              │  │         │  │  ┌──────────────┐
│  Web Browser ├──┤ Ingress ├──┼──┤              │
│              │  │         │  │  │  Server Pod 2│
└──────────────┘  └─────────┘  │  │              │
                               │  └──────────────┘
                               │  ┌──────────────┐
                               │  │              │
                               └──┤  Server Pod 3│
                                  │              │
                                  └──────────────┘
```

### Implementation Details

1. **Server Deployment**:

   - Scaled to 3 replicas for load distribution
   - Each pod is identical and stateless
   - Added pod identification in response headers

2. **Client Deployment**:

   - Single unified deployment with 3 replicas
   - ClusterIP service for internal access

3. **Ingress Controller**:
   - NGINX Ingress routes traffic between services
   - `/api` paths routed to the server service
   - All other paths routed to the client service

### Testing Load Balancing

Run the load test script to verify load balancing is working:

```bash
scripts\test-load-balancing.bat
```

This will:

1. Check that all server pods are running
2. Run a k6 load test that makes requests to the API
3. Track which pod serves each request
4. Display a summary of the distribution of requests across pods

You can manually verify the load balancing by running this command in multiple terminals:

```bash
curl -s -I http://localhost:8080/api/v1/products | findstr X-Serving-Pod
```

## Caching

The application implements Redis caching to improve performance and reduce database load.

### Redis Implementation

Redis is used for caching API responses from critical endpoints. Key features include:

- Read-through caching for GET requests
- Automatic cache invalidation after data changes
- Configurable TTL (Time-To-Live) for cached data
- Docker and Kubernetes ready configuration

### Cached Endpoints

The following endpoint categories use Redis caching:

- **Products**: List and detail views
- **Stores**: Store information and inventory
- **Stock**: Product stock levels
- **Sales**: Sales history and reporting

For more details about caching implementation, see [Caching Documentation](docs/CACHING.md).

## Monitoring

The project integrates Prometheus and Grafana for metrics monitoring:

- **Prometheus**: Collects and stores server metrics
- **Grafana**: Visualizes metrics in customizable dashboards

### Accessing Monitoring Tools

#### With Docker Compose

- Prometheus UI: <http://localhost:9090>
- Grafana Dashboard: <http://localhost:3001> (login: admin/admin)

#### With Kubernetes

```bash
# Using the dedicated monitoring script (recommended)
scripts\port-forward-monitoring.bat

# Or manually for individual services
# For Prometheus
kubectl port-forward svc/prometheus 9090:9090

# For Grafana
kubectl port-forward svc/grafana 3001:3000
```

### Key Metrics

1. **Request Rate Overview**

   ```text
   sum(rate(http_request_duration_seconds_count{app="log430-server"}[1m])) by (path)
   ```

   Shows the number of requests per second to each endpoint.

2. **Error Rate Overview**

   ```text
   sum(rate(http_request_duration_seconds_count{app="log430-server", status_code=~"4.*|5.*"}[1m])) / sum(rate(http_request_duration_seconds_count{app="log430-server"}[1m])) * 100
   ```

   Shows the percentage of requests resulting in errors.

3. **Response Time Overview**

   ```text
   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="log430-server"}[1m])) by (path, le))
   ```

   Shows the 95th percentile response time for each endpoint.

4. **Load Balancing Distribution**

   ```text
   sum by(pod) (rate(requests_total_by_pod[1m]))
   ```

   Shows how requests are distributed across server pods.

### Monitoring During Load Tests

To monitor application performance during load tests:

1. Start monitoring port forwarding:

   ```bash
   scripts\port-forward-monitoring.bat
   ```

2. Run load tests using k6:

   ```bash
   scripts\run-k6-tests.bat
   ```

3. View metrics in Prometheus/Grafana

## Data Management

The server deployment automatically seeds the database on startup if
deploying with Kubernetes.

### Default Data Injection

To have default data:

```bash
# With Docker
docker-compose exec server npm run seed

# Locally
cd server
npm run seed
```

### Database Commands

To reset Prisma migration:

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

## Project Structure

``` text
log430-lab5/
├── client/                     # React frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── services/                   # Microservices directory
│   ├── product-service/        # Product catalog service
│   ├── user-service/          # Authentication service
│   ├── store-service/         # Store management service
│   ├── stock-service/         # Inventory service
│   ├── sales-service/         # Transaction service
│   ├── refund-service/        # Return processing service
│   ├── shared/                # Shared utilities and middleware
│   ├── monitoring/            # Prometheus and Grafana config
│   └── docker-compose.microservices.yml
├── api-gateway/               # Kong API Gateway configuration
│   ├── kong.yml              # Main gateway configuration
│   ├── security-config.yml   # Security policies
│   ├── docker-compose.*.yml  # Gateway deployment files
│   └── *.bat                 # Management scripts
├── k8s/                      # Kubernetes configurations
│   ├── client.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── grafana.yaml
├── scripts/                  # Utility scripts
│   ├── run-k6-tests.bat
│   ├── test-cache-performance.bat
│   └── cleanup-k8s.bat
├── docs/                     # Documentation
│   ├── CACHING.md
│   └── *.svg                 # Architecture diagrams
└── plan.txt                  # Migration plan
```

## Additional Documentation

- **API Gateway Setup**: [api-gateway/README.md](api-gateway/README.md)
- **Phase 3 Summary**: [api-gateway/PHASE3-SUMMARY.md](api-gateway/PHASE3-SUMMARY.md)
- **Phase 4 Summary**: [api-gateway/PHASE4-SUMMARY.md](api-gateway/PHASE4-SUMMARY.md)
- **Microservices Guide**: [services/README.md](services/README.md)
- **Kubernetes Deployment**: [k8s/README.md](k8s/README.md)
- **Caching Implementation**: [docs/CACHING.md](docs/CACHING.md)
- **Architecture Documentation**: [docs/](docs/)
