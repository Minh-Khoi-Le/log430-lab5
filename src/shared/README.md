# Shared Modules

This directory contains shared code that can be used across microservices for consistent functionality and reduced duplication.

## Available Modules

### Logging

A centralized logging utility that provides consistent logging capabilities across all microservices.

```typescript
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('your-service-name');
logger.info('Service started');
logger.warn('Resource usage is high');
logger.error('Operation failed', new Error('Database connection error'));
```

See [Logging Documentation](./infrastructure/logging/README.md) for more details.

### Caching

A Redis-based caching system for improving performance and reducing database load.

```typescript
import { cacheService } from '@shared/infrastructure/caching';

// Store data in cache
await cacheService.set('user:123', userData, 300); // Cache for 5 minutes

// Retrieve from cache
const user = await cacheService.get('user:123');

// Cache middleware for Express
import { createCacheMiddleware } from '@shared/infrastructure/caching';
app.get('/api/products', createCacheMiddleware({ ttl: 300 }), productController.getAll);
```

See [Caching Documentation](./infrastructure/caching/README.md) for more details.

### HTTP Utilities

Utilities for HTTP operations including a request logger middleware and HTTP client.

```typescript
// In your Express app:
import { requestLogger } from '@shared/infrastructure/http';
app.use(requestLogger);

// For HTTP client:
import { HttpClient } from '@shared/infrastructure/http';
const client = new HttpClient('http://service-url', 5000);
const response = await client.get('/endpoint');
```

### Repository Interface

Standard repository interface for consistent data access patterns.

```typescript
import { IRepository } from '@shared/application/interfaces/repository.interface';

// Implement in your service
export class YourEntityRepository implements IRepository<YourEntity> {
  // Implementation...
}
```

### Domain Events

Infrastructure for domain events and event-driven architecture.

```typescript
import { DomainEvent, DomainEvents } from '@shared/domain/events';
import { EventBus } from '@shared/infrastructure/messaging';

// Create and dispatch events between services
```

## Usage

To use these shared modules in your service, ensure your `tsconfig.json` includes the path mapping:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../shared/*"]
    }
  },
  "include": [
    "**/*",
    "../../shared/**/*"
  ]
}
```

Then import the modules in your code using the `@shared` prefix.

## Benefits

- **Consistency**: Common patterns and implementations across services
- **Maintainability**: Update in one place, affects all services
- **Reduced Duplication**: Avoid copying code between services
- **Standardization**: Enforces best practices across the system

## Guidelines for Contributing

When adding to shared modules:

1. Ensure the module is truly useful across multiple services
2. Write comprehensive documentation and examples
3. Keep dependencies minimal
4. Write unit tests for all shared code
5. Follow the established architectural patterns
