# Product Service

Product management microservice for the LOG430 multi-store system. This service handles all product-related operations including catalog management, product information queries, and availability checking.

## Features

### Core Functionality
- **Product Catalog Management**: CRUD operations for products
- **Product Search**: Advanced search with multiple criteria
- **Availability Checking**: Stock levels across all stores
- **Price Management**: Product pricing information
- **Inventory Integration**: Coordinated with stock service

### Technical Features
- **Caching**: Redis-based caching for performance optimization
- **Metrics**: Prometheus metrics collection for monitoring
- **Health Checks**: Comprehensive health monitoring endpoints
- **Authentication**: JWT-based authentication for admin operations
- **Validation**: Request validation with detailed error messages
- **Error Handling**: Centralized error handling with consistent responses

## API Endpoints

### Public Endpoints (No Authentication Required)

#### List Products
```
GET /products
```
**Query Parameters:**
- `page`: Page number (default: 1)
- `size`: Items per page (default: 10, max: 100)
- `sort`: Sort criteria (+name, -price, etc.)
- `search`: Search term for product names/descriptions
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

**Example:**
```bash
curl "http://localhost:3001/products?page=1&size=10&search=laptop&minPrice=500&maxPrice=2000"
```

#### Get Product Details
```
GET /products/:id
```
**Example:**
```bash
curl "http://localhost:3001/products/123"
```

#### Check Product Availability
```
GET /products/:id/availability
```
Returns stock levels across all stores for the specified product.

#### Search Products
```
GET /products/search
```
**Query Parameters:**
- `q`: Search query string
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `inStock`: Filter for products with available stock
- `page`: Page number
- `size`: Results per page

### Protected Endpoints (Authentication Required)

#### Create Product
```
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Product Name",
  "price": 99.99,
  "description": "Product description"
}
```

#### Update Product
```
PUT /products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 89.99,
  "description": "Updated description"
}
```

#### Delete Product
```
DELETE /products/:id
Authorization: Bearer <token>
```

### Health and Monitoring

#### Health Check
```
GET /health
```

#### Detailed Health Check
```
GET /health/detailed
```

#### Metrics (Prometheus)
```
GET /metrics
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001                    # Service port (default: 3001)
NODE_ENV=production         # Environment (development/production)

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Configuration
REDIS_HOST=localhost        # Redis server host
REDIS_PORT=6379            # Redis server port
REDIS_PASSWORD=password    # Redis password (optional)
REDIS_DB=0                 # Redis database number

# Authentication
JWT_SECRET=your-secret-key  # JWT signing secret

# Monitoring
METRICS_PREFIX=product_service_  # Prometheus metrics prefix
```

### Docker Configuration

```bash
# Build the container
docker build -t product-service .

# Run the container
docker run -d \
  --name product-service \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:password@host:port/database \
  -e REDIS_HOST=redis-server \
  -e JWT_SECRET=your-secret-key \
  product-service
```

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis server
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations (if using shared database)
npx prisma migrate deploy
```

### Running the Service

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### Code Structure

```
product-service/
├── controllers/          # HTTP request handlers
│   └── product.controller.js
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── cache.js        # Redis caching middleware
│   ├── errorHandler.js # Error handling middleware
│   ├── metrics.js      # Prometheus metrics
│   └── validateRequest.js # Request validation
├── routes/             # Express routes
│   └── product.routes.js
├── services/           # Business logic layer
│   └── product.service.js
├── utils/              # Utility functions
│   └── cacheInvalidation.js
├── Dockerfile          # Container configuration
├── package.json        # Dependencies and scripts
└── server.js          # Application entry point
```

## Monitoring and Observability

### Metrics Collected
- HTTP request duration and count
- Product catalog size
- Product access patterns
- Database operation duration
- Error rates by type and endpoint
- Cache hit/miss rates

### Health Checks
- Database connectivity
- Redis connectivity
- Service-specific functionality
- Memory usage monitoring

### Logging
- Request/response logging
- Error logging with context
- Performance logging
- Security event logging

## Caching Strategy

### Cache Policies
- **Product Lists**: 5 minutes TTL
- **Individual Products**: 5 minutes TTL
- **Product Availability**: 1 minute TTL
- **Search Results**: 3 minutes TTL

### Cache Invalidation
- Automatic invalidation on product CRUD operations
- Pattern-based invalidation for related data
- Scheduled cleanup of expired entries

## Security

### Authentication
- JWT token validation for protected endpoints
- Role-based access control (admin role required for modifications)
- Token expiration handling

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection headers
- Rate limiting (via API Gateway)

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "service": "product-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    "field": "Specific error details"
  }
}
```

### Common Error Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (product doesn't exist)
- `409`: Conflict (cannot delete referenced product)
- `500`: Internal Server Error

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## Deployment

### Docker Compose
See the main project's `docker-compose.yml` for service configuration.

### Kubernetes
See the `k8s/` directory for Kubernetes deployment manifests.

### Scaling Considerations
- Stateless design allows horizontal scaling
- Database connection pooling
- Redis clustering for cache scalability
- Load balancing via API Gateway

## API Gateway Integration

This service is designed to work with an API Gateway:
- Routes are prefixed with `/products` (no `/api/v1` prefix)
- Service discovery via health checks
- Metrics aggregation
- Centralized authentication (optional)

## Contributing

1. Follow existing code patterns and documentation standards
2. Add comprehensive tests for new features
3. Update this README for new functionality
4. Ensure all linting checks pass
5. Include performance impact analysis for changes
