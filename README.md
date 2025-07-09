# LOG430 Lab 5 - Retail Store Management System

## Table of Contents

- [LOG430 Lab 5 - Retail Store Management System](#log430-lab-5---retail-store-management-system)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Architecture](#architecture)
  - [Technical Stack](#technical-stack)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Running the Application](#running-the-application)
    - [Manual Startup](#manual-startup)
  - [Local Development](#local-development)
  - [API Gateway](#api-gateway)
  - [Monitoring and Observability](#monitoring-and-observability)
    - [Monitoring Stack](#monitoring-stack)
    - [Four Golden Signals](#four-golden-signals)
    - [Starting Monitoring](#starting-monitoring)
  - [Performance Testing](#performance-testing)
    - [Test Scenarios](#test-scenarios)
    - [Running Load Tests](#running-load-tests)
  - [Caching](#caching)
    - [Redis Implementation](#redis-implementation)
    - [Cached Services](#cached-services)
  - [Data Management](#data-management)
    - [Database Setup](#database-setup)
    - [Demo Data Seeding](#demo-data-seeding)
  - [Project Structure](#project-structure)
  - [Available Scripts](#available-scripts)
    - [`quick-start.bat`](#quick-startbat)
    - [`seed-database.bat`](#seed-databasebat)
    - [`start-monitoring.bat`](#start-monitoringbat)
    - [`test-monitoring.bat`](#test-monitoringbat)
    - [`run-tests.bat`](#run-testsbat)
    - [`quick-test.bat`](#quick-testbat)
  - [Features Highlights](#features-highlights)
    - [Admin Dashboard](#admin-dashboard)
    - [Shopping Experience](#shopping-experience)
    - [System Reliability](#system-reliability)
    - [Development Experience](#development-experience)

## Description

This is a comprehensive microservices-based retail store management system built for LOG430 Lab 5. The application provides a complete solution for managing retail operations including user authentication, product catalog, inventory tracking, sales transactions, and administrative features with full observability and load testing capabilities.

**Key Features:**

- **User Management**: Role-based authentication system (admin/client) with JWT tokens
- **Product Catalog**: Full CRUD operations for products with multi-store inventory management
- **Shopping Cart**: Complete e-commerce workflow with cart management and checkout
- **Real-time Stock Updates**: Automatic inventory synchronization after purchases
- **Transaction Management**: Comprehensive sales and refund processing with detailed receipts
- **Admin Dashboard**: Advanced analytics with PDF report generation, store performance metrics
- **Monitoring**: Full observability with Prometheus, Grafana, and Four Golden Signals
- **Load Testing**: Comprehensive k6 testing suite with multiple scenarios
- **API Gateway**: Kong Gateway for routing, authentication, and rate limiting

## Architecture

The system follows a microservices architecture with comprehensive monitoring and observability:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Kong Gateway  │    │   Microservices │
│   (React/Vite)  │◄──►│   (API Gateway) │◄──►│                 │
│   localhost:5173│    │   localhost:8000│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │User Service │ │
                                               │ │    :3001    │ │
                                               │ └─────────────┘ │
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │Catalog Svc  │ │
                                               │ │    :3002    │ │
                                               │ └─────────────┘ │
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │Transaction  │ │
                                               │ │ Service     │ │
                                               │ │    :3003    │ │
                                               │ └─────────────┘ │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Monitoring    │
                                               │   Stack         │
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │ Prometheus  │ │
                                               │ │    :9090    │ │
                                               │ └─────────────┘ │
                                               │                 │
                                               │ ┌─────────────┐ │
                                               │ │  Grafana    │ │
                                               │ │    :3004    │ │
                                               │ └─────────────┘ │
                                               └─────────────────┘
```

## Technical Stack

**Frontend:**

- React 19 with Vite 6 build tool
- Material-UI (MUI) v7 for modern component library
- React Router DOM v7 for navigation
- Axios for HTTP client communication
- jsPDF for PDF report generation

**Backend Microservices:**

- Node.js 18+ with Express.js framework
- TypeScript for type safety and better development experience
- Domain-Driven Design (DDD) architecture
- Clean Architecture patterns with dependency injection

**API Gateway:**

- Kong Gateway for centralized routing and authentication
- API key-based authentication with consumers
- Rate limiting and request size limiting
- CORS support for cross-origin requests
- Prometheus metrics collection

**Database & Persistence:**

- PostgreSQL 15 as primary database (shared across services)
- Prisma ORM v5 for type-safe database access
- Structured relational schema with proper foreign key relationships
- Database migrations with Prisma Migrate

**Caching:**

- Redis 7 for API response caching and session management
- Automatic cache invalidation on data mutations
- Service-specific caching strategies

**Monitoring & Observability:**

- Prometheus for metrics collection and alerting
- Grafana for visualization and dashboards
- Four Golden Signals monitoring (Latency, Traffic, Errors, Saturation)
- Node Exporter for system metrics
- PostgreSQL Exporter for database metrics
- Redis Exporter for cache metrics

**Load Testing:**

- k6 for comprehensive performance testing
- Multiple testing scenarios (spike, load, stress, endurance)
- End-to-end user journey testing
- Multi-user concurrent testing scenarios

**Containerization:**

- Docker & Docker Compose for orchestration
- Multi-service container management
- Health checks and dependency management
- Separate networks for services and monitoring

## Quick Start

### Prerequisites

- **Docker & Docker Compose** installed
- **Node.js 18+** for local development (optional)
- **Windows** environment (scripts are .bat files)
- **k6** for load testing (optional)

### Running the Application

The simplest way to start the entire system:

```bash
cd src/scripts
.\quick-start.bat
```

This script will:

1. Stop and clean up any existing containers
2. Build all Docker images
3. Start PostgreSQL, Redis, and all microservices
4. Start Kong API Gateway and wait for it to be ready
5. Run database migrations and seed demo data
6. Launch the web client locally (not in Docker)

### Manual Startup

If you prefer manual control:

```bash
cd src

# Start backend services and monitoring
docker-compose up -d

# Wait for services to be ready, then seed database
docker-compose run --rm db-seed

# Start frontend locally
cd web-client
npm install
npm run dev
```

**Access Points:**

- **Web Client**: <http://localhost:5173>
- **API Gateway**: <http://localhost:8000>
- **Kong Admin**: <http://localhost:8001>
- **Prometheus**: <http://localhost:9090>
- **Grafana**: <http://localhost:3004> (admin/admin)

**Demo Credentials:**

- **Admin**: `admin` / `admin123`
- **Client**: `client` / `client123`

## Local Development

For development without Docker:

```bash
# Start PostgreSQL, Redis, and monitoring via Docker
cd src
docker-compose up -d postgres redis prometheus grafana

# Start User Service
cd services/user-service
npm install
npm run dev

# Start Catalog Service (new terminal)
cd services/catalog-service
npm install
npm run dev

# Start Transaction Service (new terminal)
cd services/transaction-service
npm install
npm run dev

# Start Kong Gateway
docker-compose up -d kong

# Start Web Client (new terminal)
cd web-client
npm install
npm run dev
```

## API Gateway

The system uses Kong Gateway as an API Gateway to route requests to the appropriate microservices with comprehensive security and monitoring:

**Public Endpoints** (no authentication required):

- `GET /api/stores` - List all stores (catalog-service-public)

**Authenticated Endpoints** (require API key):

- `/api/auth/*` - User authentication (user-service)
- `/api/users/*` - User management (user-service)
- `/api/products/*` - Product catalog (catalog-service)
- `/api/stock/*` - Inventory management (catalog-service)
- `/api/sales/*` - Sales transactions (transaction-service)
- `/api/refunds/*` - Refund processing (transaction-service)

**Security Features:**

- **API Key Authentication**: `frontend-app-key-12345` for web client
- **Rate Limiting**: 300 requests/minute, 1000 requests/hour
- **Request Size Limiting**: 1KB max payload
- **CORS**: Configured for frontend origins
- **Prometheus Metrics**: All requests tracked for monitoring

**API Key Usage:**

```javascript
headers: {
  "X-API-Key": "frontend-app-key-12345"
}
```

## Monitoring and Observability

The system implements comprehensive monitoring based on the Four Golden Signals:

### Monitoring Stack

**Prometheus** (Port 9090):

- Metrics collection and storage
- Alert rule evaluation
- Time-series database

**Grafana** (Port 3004):

- Visualization dashboards
- Default credentials: admin/admin
- Pre-configured dashboards for all services

**Exporters**:

- Node Exporter (Port 9100) - System metrics
- PostgreSQL Exporter (Port 9187) - Database metrics
- Redis Exporter (Port 9121) - Cache metrics

### Four Golden Signals

1. **Latency**: Response time metrics (average, 95th, 99th percentile)
2. **Traffic**: Requests per second by service
3. **Errors**: Error rate and count by service and endpoint
4. **Saturation**: CPU, memory, disk, and network utilization

### Starting Monitoring

```bash
cd src/scripts
.\start-monitoring.bat
```

Access dashboards at:

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3004>

## Performance Testing

Comprehensive k6 load testing suite with multiple scenarios:

### Test Scenarios

- **auth-test.js**: Authentication endpoint testing
- **product-test.js**: Product catalog performance
- **sales-test.js**: Sales transaction testing
- **comprehensive-test.js**: All endpoints testing
- **e2e-scenario.js**: End-to-end user journey
- **spike-test.js**: Spike load testing
- **multi-user-scenario.js**: Multi-user concurrent testing
- **high-concurrency-stress.js**: High-concurrency stress testing

### Running Load Tests

```bash
cd k6/scripts
.\run-tests.bat
```

Or run specific tests:

```bash
cd k6
k6 run tests/comprehensive-test.js
```

**Prerequisites**: Install k6 from <https://k6.io/docs/getting-started/installation/>

## Caching

### Redis Implementation

Redis is used for comprehensive caching to improve performance:

**Configuration:**

- Redis 7 Alpine running on port 6379
- TTL (Time-To-Live): Configurable per endpoint
- Automatic cache invalidation on data mutations
- Connection pooling for better performance

### Cached Services

**User Service**:

- User profile data
- Authentication tokens
- Session management

**Catalog Service**:

- Product listings and details
- Store information
- Stock levels and inventory

**Transaction Service**:

- Sales history and analytics
- Dashboard statistics
- Refund processing data

**Cache Key Patterns:**

- User: `user:profile:${userId}`, `user:auth:${token}`
- Catalog: `catalog:products:all`, `catalog:stock:store:${storeId}`
- Transaction: `transaction:sales:user:${userId}`, `dashboard:stats`

## Data Management

### Database Setup

The system uses a shared PostgreSQL database with Prisma ORM:

**Database Schema:**

- **Users**: Authentication and user profiles with role-based access
- **Stores**: Physical store locations with addresses
- **Products**: Product catalog with pricing and descriptions
- **Stock**: Per-store inventory levels (junction table)
- **Sales**: Transaction records with line items
- **SaleLines**: Individual product line items in sales
- **Refunds**: Refund processing with detailed tracking
- **RefundLines**: Individual product line items in refunds

**Key Relationships:**

- Users ↔ Sales (one-to-many)
- Stores ↔ Sales (one-to-many)
- Products ↔ Stock (many-to-many via Stock table)
- Sales ↔ SaleLines (one-to-many)
- Sales ↔ Refunds (one-to-many)

**Migrations:**
Database migrations are handled automatically via Docker containers using Prisma Migrate.

### Demo Data Seeding

The system includes comprehensive demo data for testing:

**Users:**

- Admin user: `admin` / `admin123` (full system access)
- Client user: `client` / `client123` (customer access)

**Stores:**

- 3 sample stores: Downtown Store, Mall Store, Airport Store
- Complete with addresses and contact information

**Products:**

- 25+ sample products across multiple categories
- Electronics, Home goods, Clothing, Sports equipment
- Realistic pricing and descriptions

**Inventory:**

- Pre-configured stock levels for each store
- Realistic quantity distributions
- Varied availability across stores

**To manually reseed the database:**

```bash
cd src/scripts
.\seed-database.bat
```

## Project Structure

```text
├── README.md                    # This file
├── docs/                        # Documentation directory
├── k6/                          # Load testing suite
│   ├── config/                  # Test configurations
│   ├── tests/                   # Individual test files
│   ├── scenarios/               # Complex test scenarios
│   ├── utils/                   # Testing utilities
│   └── scripts/                 # Test runner scripts
├── monitoring/                  # Monitoring configuration
│   ├── prometheus.yml           # Prometheus configuration
│   ├── alert_rules.yml          # Alert rules
│   └── grafana/                 # Grafana dashboards and provisioning
└── src/                         # Main source code
    ├── docker-compose.yml       # Container orchestration
    ├── package.json             # Root package configuration
    ├── api-gateway/             # Kong Gateway configuration
    │   ├── config/              # Gateway configuration files
    │   └── kong/                # Kong service definitions
    ├── services/                # Microservices
    │   ├── user-service/        # Authentication & user management
    │   │   ├── main.ts          # Service entry point
    │   │   ├── application/     # Use cases and application logic
    │   │   ├── domain/          # Domain entities and business logic
    │   │   └── infrastructure/  # Controllers, repositories, middleware
    │   ├── catalog-service/     # Products, stores, inventory
    │   │   ├── server.ts        # Service entry point
    │   │   ├── application/     # Use cases and application logic
    │   │   ├── domain/          # Domain entities and business logic
    │   │   └── infrastructure/  # Controllers, repositories, middleware
    │   ├── transaction-service/ # Sales & refunds
    │   │   ├── server.ts        # Service entry point
    │   │   ├── application/     # Use cases and application logic
    │   │   ├── domain/          # Domain entities and business logic
    │   │   └── infrastructure/  # Controllers, repositories, middleware
    │   ├── db-migrate/          # Database migration container
    │   └── db-seeder/           # Database seeding container
    ├── shared/                  # Shared utilities & types
    │   ├── application/         # Base use cases & interfaces
    │   ├── domain/              # Domain events & value objects
    │   └── infrastructure/      # Caching, HTTP, logging, metrics utilities
    ├── web-client/              # React frontend application
    │   ├── src/
    │   │   ├── components/      # Reusable UI components
    │   │   ├── pages/           # Page components
    │   │   │   ├── Dashboard.jsx # Admin dashboard with PDF reports
    │   │   │   ├── Products.jsx  # Product catalog management
    │   │   │   ├── Sales.jsx     # Sales management
    │   │   │   ├── Refunds.jsx   # Refund processing
    │   │   │   ├── CartPage.jsx  # Shopping cart
    │   │   │   └── ...          # Other page components
    │   │   ├── context/         # React context providers
    │   │   ├── api/             # API communication layer
    │   │   └── hooks/           # Custom React hooks
    │   ├── public/              # Static assets
    │   └── package.json         # Frontend dependencies
    ├── prisma/                  # Database schema & migrations
    │   ├── schema.prisma        # Database schema definition
    │   └── migrations/          # Database migration files
    └── scripts/                 # Utility scripts
        ├── quick-start.bat      # Complete system startup
        ├── seed-database.bat    # Database seeding only
        ├── start-monitoring.bat # Start monitoring stack
        └── README.md            # Scripts documentation
```

## Available Scripts

**Located in `src/scripts/`:**

### `quick-start.bat`

Complete system startup script that:

- Stops and cleans existing containers
- Builds all Docker images
- Starts all services (database, cache, microservices, Kong)
- Waits for Kong to be ready
- Seeds database with demo data
- Starts frontend locally

### `seed-database.bat`

Database seeding script that:

- Runs database migrations
- Seeds demo data (users, stores, products, inventory)
- Useful for resetting demo data

### `start-monitoring.bat`

Monitoring stack startup script that:

- Starts Prometheus, Grafana, and all exporters
- Configures dashboards and data sources
- Useful for development and testing

### `test-monitoring.bat`

Monitoring validation script that:

- Tests all monitoring endpoints
- Validates metrics collection
- Useful for troubleshooting

**Located in `k6/scripts/`:**

### `run-tests.bat`

Comprehensive load testing script that:

- Runs all k6 test scenarios
- Generates performance reports
- Tests system under various load conditions

### `quick-test.bat`

Quick validation script that:

- Runs basic endpoint tests
- Validates system functionality
- Useful for smoke testing

**Frontend Scripts (in `src/web-client/`):**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Service Scripts (in each service directory):**

- `npm run dev` - Start service in development mode
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production build
- `npm test` - Run unit tests

**Root Scripts (in `src/`):**

- `npm run start:all` - Start all services concurrently
- `npm run build:all` - Build all services
- `npm run install:all` - Install dependencies for all services
- `npm run test:all` - Run all service tests

## Features Highlights

### Admin Dashboard

- **Comprehensive Analytics**: Store performance, sales metrics, revenue analysis
- **PDF Report Generation**: Export detailed performance reports using jsPDF
- **Real-time Data**: Live updates from all microservices
- **Four Golden Signals**: Latency, traffic, errors, and saturation metrics

### Shopping Experience

- **Modern UI**: Material-UI components with responsive design
- **Real-time Cart**: Live inventory updates and cart management
- **Secure Checkout**: JWT-based authentication and secure transactions
- **Order History**: Complete transaction history with detailed receipts

### System Reliability

- **Health Checks**: All services have health check endpoints
- **Graceful Degradation**: Fallback mechanisms for service failures
- **Monitoring**: Comprehensive observability with alerting
- **Load Testing**: Automated performance validation

### Development Experience

- **TypeScript**: Full type safety across all services
- **Docker**: Consistent development and deployment environment
- **Hot Reload**: Development servers with automatic reload
- **Testing**: Unit tests and comprehensive load testing suite
