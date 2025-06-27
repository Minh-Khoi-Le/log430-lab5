# Shared Database Implementation Guide

This guide explains how to use the shared database functionality across all microservices in the LOG430 Lab5 project.

## Overview

The shared database module provides centralized database access management for all microservices, using Prisma ORM with PostgreSQL. This ensures consistent connection handling, error management, and performance monitoring across all services.

## Key Features

✅ **Centralized Connection Management**: Single database client shared across services  
✅ **Health Monitoring**: Database connectivity checks with detailed metrics  
✅ **Error Handling**: Consistent Prisma error handling and HTTP error conversion  
✅ **Performance Monitoring**: Query metrics and execution tracking  
✅ **Graceful Shutdown**: Proper database disconnection on service shutdown  
✅ **Development Logging**: Query logging in development mode  

## Architecture

```
┌─────────────────┐
│ Microservice A  │
├─────────────────┤
│ Service Logic   │
├─────────────────┤
│ Shared Database │ ←── Centralized DB Client
├─────────────────┤
│ Prisma Client   │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ PostgreSQL DB   │
└─────────────────┘
```

## Usage in Microservices

### 1. Service Initialization

Update your main server file to initialize the shared database:

```javascript
// server.js
import {
  initializeSharedServices,
  cleanupSharedServices,
  checkDatabaseHealth
} from '@log430/shared';

async function initializeApp() {
  try {
    // Initialize shared services including database
    await initializeSharedServices({
      serviceName: 'your-service-name',
      enableDatabase: true,
      enableDatabaseLogging: process.env.NODE_ENV === 'development'
    });
    
    // ... rest of your initialization
  } catch (error) {
    logger.error('Failed to initialize service', { error: error.message });
    process.exit(1);
  }
}
```

### 2. Service Shutdown

Update your shutdown handling:

```javascript
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(async () => {
    try {
      await cleanupSharedServices({ serviceName: 'your-service-name' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### 3. Health Check Integration

Update your health check endpoint:

```javascript
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth('your-service-name');
  
  res.status(dbHealth.healthy ? 200 : 503).json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    service: 'your-service-name',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    // ... other health checks
  });
});
```

### 4. Service Layer Implementation

Create service-specific database helpers:

```javascript
// services/your-service.service.js
import { getDatabaseClient, DatabaseUtils, executeTransaction } from '@log430/shared';

// Get the shared database client
function getPrisma() {
  return getDatabaseClient('your-service-name');
}

export async function createEntity(data) {
  try {
    const prisma = getPrisma();
    
    return await prisma.yourEntity.create({
      data: data,
      include: {
        // related data
      }
    });
  } catch (error) {
    // Use shared error handling
    DatabaseUtils.handlePrismaError(error, 'your-service-name');
  }
}

export async function listEntities(options = {}) {
  try {
    const prisma = getPrisma();
    const { page = 1, size = 10, search, sort } = options;
    
    const offset = (page - 1) * size;
    
    // Use shared utilities for common operations
    const where = DatabaseUtils.buildTextSearchWhere(search, ['name', 'description']);
    const orderBy = DatabaseUtils.buildOrderBy(sort, ['name', 'createdAt', 'id']);
    
    const [entities, total] = await Promise.all([
      prisma.yourEntity.findMany({
        where,
        orderBy,
        skip: offset,
        take: size
      }),
      prisma.yourEntity.count({ where })
    ]);
    
    return {
      entities,
      pagination: DatabaseUtils.buildPaginationMetadata(page, size, total)
    };
  } catch (error) {
    DatabaseUtils.handlePrismaError(error, 'your-service-name');
  }
}

export async function updateEntity(id, data) {
  try {
    return await executeTransaction(async (prisma) => {
      // Complex transaction logic
      const entity = await prisma.yourEntity.update({
        where: { id: parseInt(id) },
        data: data
      });
      
      // Other related updates...
      
      return entity;
    }, 'your-service-name');
  } catch (error) {
    DatabaseUtils.handlePrismaError(error, 'your-service-name');
  }
}
```

## Available Utilities

### DatabaseUtils

The `DatabaseUtils` object provides common database operations:

```javascript
import { DatabaseUtils } from '@log430/shared';

// Error handling
DatabaseUtils.handlePrismaError(error, serviceName);

// Pagination
DatabaseUtils.buildPaginationMetadata(page, size, total);

// Text search
DatabaseUtils.buildTextSearchWhere(searchTerm, ['field1', 'field2']);

// Sorting
DatabaseUtils.buildOrderBy(sortString, allowedFields);
```

### Transaction Management

For complex operations requiring transactions:

```javascript
import { executeTransaction } from '@log430/shared';

const result = await executeTransaction(async (prisma) => {
  // Multiple database operations
  const entity1 = await prisma.entity1.create({ data: data1 });
  const entity2 = await prisma.entity2.update({ 
    where: { id: entity1.id }, 
    data: data2 
  });
  
  return { entity1, entity2 };
}, 'your-service-name');
```

## Migration Steps for Existing Services

### 1. Update Package Dependencies

Ensure your service's `package.json` includes the updated shared module:

```json
{
  "dependencies": {
    "@log430/shared": "file:../shared",
    "@prisma/client": "^5.14.0"
  }
}
```

### 2. Remove Local Database Client

If you have a local Prisma client instance:

```javascript
// Remove this:
// const prisma = new PrismaClient();

// Replace with:
import { getDatabaseClient } from '@log430/shared';
const getPrisma = () => getDatabaseClient('your-service-name');
```

### 3. Update All Database Calls

Replace direct Prisma calls:

```javascript
// Before:
const result = await prisma.model.findMany();

// After:
const result = await getPrisma().model.findMany();
```

### 4. Add Error Handling

Wrap database operations with proper error handling:

```javascript
// Before:
export async function getEntity(id) {
  return await prisma.entity.findUnique({ where: { id } });
}

// After:
export async function getEntity(id) {
  try {
    return await getPrisma().entity.findUnique({ where: { id } });
  } catch (error) {
    DatabaseUtils.handlePrismaError(error, 'your-service-name');
  }
}
```

## Migration Completion Status

### ✅ Successfully Migrated Services

#### Product Service
- ✅ Fully migrated to shared database
- ✅ All queries use `getDatabaseClient()`
- ✅ Server.js updated with shared initialization
- ✅ Business logic uses shared utilities

#### Cart Service  
- ✅ Server.js updated with shared initialization
- ✅ All ApiError instances replaced with BaseError
- ✅ Uses CartDB helper for database operations
- ✅ All cart operations (create, get, update, clear, delete) migrated
- ✅ Integrated with shared transaction handling
- ✅ Proper error handling and logging

#### Stock Service
- ✅ Server.js updated with shared initialization  
- ✅ All `prisma` references updated to `getPrisma()`
- ✅ Transaction operations use `executeTransaction()`
- ✅ All stock operations (get, update, transfer) migrated
- ✅ Analytics and reporting queries updated
- ✅ Proper error handling and logging

### 🔄 Remaining Services (Require Manual Migration)

The following services still need to be migrated following the same pattern:

- **Sales Service**: Server initialization + service layer migration
- **Store Service**: Server initialization + service layer migration  
- **User Service**: Server initialization + service layer migration
- **Refund Service**: Server initialization + service layer migration

### 🎯 Testing

To test the migrated services, run:

```bash
node scripts/test-migration.js
```

This will verify that cart and stock services are working correctly with the shared database layer.

### 📊 Migration Benefits Achieved

1. **Centralized Database Management**: Single point of configuration and monitoring
2. **Consistent Error Handling**: All services use the same error patterns
3. **Shared Utilities**: Common database operations standardized
4. **Transaction Management**: Proper transaction handling across services
5. **Connection Pooling**: Optimized database connections
6. **Health Monitoring**: Built-in database health checks
7. **Logging Integration**: Consistent logging across all database operations

## Configuration

### Environment Variables

Each service should have these database-related environment variables:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/log430

# Service-specific
SERVICE_NAME=your-service-name
NODE_ENV=development
```

### Prisma Configuration

The shared Prisma client is configured with:

- **Development**: Query logging enabled
- **Production**: Error logging only
- **Connection pooling**: Automatic
- **Error formatting**: Pretty format for debugging

## Monitoring and Observability

### Health Checks

Each service provides database health information:

```json
{
  "status": "healthy",
  "database": {
    "healthy": true,
    "status": "connected",
    "message": "Database is responding",
    "responseTime": "15ms",
    "metrics": {
      "totalQueries": 150,
      "totalErrors": 0,
      "averageQueryTime": "12ms",
      "lastActivity": "2025-06-26T12:00:00.000Z"
    }
  }
}
```

### Metrics

Database metrics are automatically collected:

- Query execution times
- Error rates
- Connection status
- Transaction performance

### Logging

Database operations are logged with appropriate levels:

- **Debug**: Query details (development only)
- **Info**: Connection events, health checks
- **Warn**: Performance issues, deprecations
- **Error**: Connection failures, query errors

## Best Practices

### 1. Service Naming
Always provide your service name when calling database functions:

```javascript
getDatabaseClient('product-service')
checkDatabaseHealth('product-service')
```

### 2. Error Handling
Use the shared error handling for consistent API responses:

```javascript
try {
  // database operation
} catch (error) {
  DatabaseUtils.handlePrismaError(error, 'your-service-name');
}
```

### 3. Transactions
Use `executeTransaction` for operations involving multiple models:

```javascript
await executeTransaction(async (prisma) => {
  // Multiple operations
}, 'your-service-name');
```

### 4. Performance
- Use pagination for large result sets
- Include only necessary relations
- Use appropriate indexes (defined in Prisma schema)

### 5. Testing
Mock the shared database client in tests:

```javascript
import { getDatabaseClient } from '@log430/shared';

jest.mock('@log430/shared', () => ({
  getDatabaseClient: jest.fn(() => mockPrismaClient)
}));
```

## Troubleshooting

### Common Issues

**Database not initialized error:**
```
Error: Database not initialized for service: your-service-name
```
**Solution**: Ensure `initializeSharedServices()` is called before using database functions.

**Connection errors:**
```
Error: Can't reach database server
```
**Solution**: Check `DATABASE_URL` environment variable and PostgreSQL server status.

**Prisma client errors:**
```
Error: Prisma Client is not configured
```
**Solution**: Run `npm run db:generate` to generate Prisma client.

### Debug Mode

Enable debug logging in development:

```bash
NODE_ENV=development
```

This will log all database queries for debugging purposes.

## Next Steps

1. **Complete remaining service migrations**
2. **Add service-specific database helpers**  
3. **Implement comprehensive test coverage**
4. **Add performance monitoring dashboards**
5. **Create automated migration scripts**

For assistance with migration, refer to the fully implemented Product Service as a reference example.
