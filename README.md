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
  - [Caching](#caching)
    - [Redis Implementation](#redis-implementation)
    - [Cached Services](#cached-services)
  - [Data Management](#data-management)
    - [Database Setup](#database-setup)
    - [Demo Data Seeding](#demo-data-seeding)
  - [Project Structure](#project-structure)
  - [Available Scripts](#available-scripts)

## Description

This is a microservices-based retail store management system built for LOG430 Lab 5. The application provides a comprehensive solution for managing retail operations including user authentication, product catalog, inventory tracking, sales transactions, and administrative features.

Key features:

- **User Management**: Login/registration with role-based access (admin/client)
- **Product Catalog**: CRUD operations for products with multi-store inventory
- **Shopping Cart**: Add to cart, checkout, and purchase workflow
- **Real-time Stock Updates**: Automatic inventory updates after purchases
- **Transaction History**: Sales and refund tracking with detailed receipts
- **Admin Dashboard**: Store management, product CRUD, and sales analytics

## Architecture

The system follows a microservices architecture with:

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
```

## Technical Stack

**Frontend:**

- React 19 with Vite build tool
- Material-UI (MUI) for component library
- React Router for navigation
- Axios for API communication

**Backend Microservices:**

- Node.js 20 with Express.js framework
- TypeScript for type safety
- Domain-Driven Design (DDD) architecture
- Clean Architecture patterns

**API Gateway:**

- Kong Gateway for routing and authentication
- CORS support for frontend integration
- API key-based authentication

**Persistence:**

- PostgreSQL database (shared across services)
- Prisma ORM for database access
- Structured schema with proper relationships

**Caching:**

- Redis for API response caching
- Automatic cache invalidation

**Containerization:**

- Docker & Docker Compose
- Multi-service orchestration
- Development and production configurations

## Quick Start

### Prerequisites

- **Docker & Docker Compose** installed
- **Node.js 20+** for local development (optional)
- **Windows** (scripts are .bat files)

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
5. Seed the database with demo data
6. Launch the web client locally (not in Docker)

### Manual Startup

If you prefer manual control:

```bash
cd src

# Start backend services
docker-compose up -d

# Wait for Kong to be ready, then seed database
docker-compose run --rm db-seed

# Start frontend locally
cd web-client
npm install
npm run dev
```

Access the application:

- **Web Client**: <http://localhost:5173>
- **API Gateway**: <http://localhost:8000>
- **Kong Admin**: <http://localhost:8001>

**Demo Credentials:**

- **Admin**: admin / admin123
- **Client**: client / client123

## Local Development

For development without Docker:

```bash
# Start PostgreSQL and Redis via Docker
cd src
docker-compose up -d postgres redis

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

The system uses Kong Gateway as an API Gateway to route requests to the appropriate microservices:

**Public Endpoints** (no authentication):

- `GET /api/stores` - List all stores

**Authenticated Endpoints** (require API key):

- `/api/auth/*` - User authentication (user-service)
- `/api/users/*` - User management (user-service)
- `/api/products/*` - Product catalog (catalog-service)
- `/api/stock/*` - Inventory management (catalog-service)
- `/api/sales/*` - Sales transactions (transaction-service)
- `/api/refunds/*` - Refund processing (transaction-service)
- `/api/dashboard/*` - Dashboard analytics (catalog-service)

**Authentication:**

- API Key: `frontend-app-key-12345`
- Passed via `X-API-Key` header
- Configured automatically in frontend

## Caching

### Redis Implementation

Redis is used for caching API responses to improve performance and reduce database load.

**Configuration:**

- Redis runs on port 6379
- TTL (Time-To-Live): Configurable per endpoint
- Automatic cache invalidation on data changes

### Cached Services

**Catalog Service:**

- Product listings and details
- Store information
- Stock levels and inventory

**Transaction Service:**

- Sales history and analytics
- Dashboard statistics

Cache keys follow the pattern: `service:endpoint:params`

Example: `catalog:products:all`, `catalog:stock:store:1`

## Data Management

### Database Setup

The system uses a shared PostgreSQL database with Prisma ORM:

**Database Schema:**

- **Users**: Authentication and user profiles
- **Stores**: Physical store locations
- **Products**: Product catalog with pricing
- **Stock**: Per-store inventory levels
- **Sales**: Transaction records with line items
- **Refunds**: Refund processing and tracking

**Migrations:**
Database migrations are handled automatically via Docker containers.

### Demo Data Seeding

The system includes comprehensive demo data:

**Users:**

- Admin user: `admin` / `admin123`
- Client user: `client` / `client123`

**Stores:**

- 3 sample stores (Downtown, Mall, Airport)

**Products:**

- 25+ sample products across different categories
- Electronics, Home goods, Clothing, etc.

**Inventory:**

- Pre-configured stock levels for each store
- Realistic quantity distributions

**To manually reseed the database:**

```bash
cd src/scripts
.\seed-database.bat
```

## Project Structure

```text
src/
├── api-gateway/           # Kong Gateway configuration
│   ├── config/           # Gateway configuration files
│   └── kong/             # Kong service definitions
├── services/             # Microservices
│   ├── user-service/     # Authentication & user management
│   ├── catalog-service/  # Products, stores, inventory
│   ├── transaction-service/ # Sales & refunds
│   ├── db-migrate/       # Database migration container
│   └── db-seeder/        # Database seeding container
├── shared/               # Shared utilities & types
│   ├── application/      # Base use cases & interfaces
│   ├── domain/           # Domain events & value objects
│   └── infrastructure/   # Caching, HTTP, logging utilities
├── web-client/           # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context providers
│   │   └── api/          # API communication layer
│   └── public/           # Static assets
├── prisma/               # Database schema & migrations
├── scripts/              # Utility scripts
└── docker-compose.yml    # Container orchestration
```

## Available Scripts

**Located in `src/scripts/`:**

- `quick-start.bat` - Complete system startup
- `seed-database.bat` - Database seeding only

**For more details, see: [Scripts Documentation](src/scripts/README.md)**
