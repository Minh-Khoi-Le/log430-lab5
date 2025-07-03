# Transaction Service

The Transaction Service is a microservice responsible for managing sales and refunds in the retail system. It follows Domain-Driven Design (DDD) principles and Clean Architecture patterns.

## Features

- **Sales Management**: Create, read, update sales transactions with line items
- **Refunds Management**: Process refunds with validation against original sales
- **Transaction Tracking**: Track transaction history by user, store, and date ranges
- **Business Rules**: Enforce refund policies and transaction integrity
- **Reporting**: Generate sales and refunds summaries with analytics

## Architecture

The service follows a layered architecture:

```
transaction-service/
├── domain/                 # Business logic and entities
│   ├── entities/          # Core business objects (Sale, Refund, Lines)
│   ├── repositories/      # Repository interfaces
│   └── aggregates/        # Domain aggregates
├── application/           # Use cases and DTOs
│   ├── use-cases/        # Business use cases
│   └── dtos/             # Data transfer objects
├── infrastructure/       # External concerns
│   ├── database/         # Prisma repository implementations
│   └── http/             # HTTP controllers and routes
└── server.ts             # Application entry point
```

## API Endpoints

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID
- `GET /api/sales/user/:userId` - Get sales by user
- `GET /api/sales/store/:storeId` - Get sales by store
- `GET /api/sales/summary?startDate=&endDate=` - Get sales summary
- `POST /api/sales` - Create new sale
- `PUT /api/sales/:id/status` - Update sale status

### Refunds
- `GET /api/refunds` - Get all refunds
- `GET /api/refunds/:id` - Get refund by ID
- `GET /api/refunds/user/:userId` - Get refunds by user
- `GET /api/refunds/store/:storeId` - Get refunds by store
- `GET /api/refunds/sale/:saleId` - Get refunds for a specific sale
- `GET /api/refunds/summary?startDate=&endDate=` - Get refunds summary
- `POST /api/refunds` - Create new refund

## Data Models

### Sale
```typescript
{
  id: number;
  date: Date;
  total: number;
  status: string; // 'active', 'completed', 'refunded', 'partially_refunded'
  storeId: number;
  userId: number;
  lines: SaleLineDTO[];
}
```

### Refund
```typescript
{
  id: number;
  date: Date;
  total: number;
  reason: string;
  storeId: number;
  userId: number;
  saleId: number;
  lines: RefundLineDTO[];
}
```

### Sale/Refund Line
```typescript
{
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

## Business Rules

1. **Sale Validation**: Sales must have valid line items with positive quantities and prices
2. **Refund Authorization**: Only active/completed sales can be refunded
3. **Refund Limits**: Cannot refund more than the original sale amount
4. **Status Management**: Automatic status updates based on refund activity
5. **Line Item Integrity**: All line items must reference valid products

## Request Examples

### Create Sale
```json
{
  "userId": 1,
  "storeId": 1,
  "lines": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 29.99
    },
    {
      "productId": 2,
      "quantity": 1,
      "unitPrice": 15.50
    }
  ]
}
```

### Create Refund
```json
{
  "userId": 1,
  "storeId": 1,
  "saleId": 123,
  "reason": "Defective product",
  "lines": [
    {
      "productId": 1,
      "quantity": 1,
      "unitPrice": 29.99
    }
  ]
}
```

## Environment Variables

- `PORT`: Service port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (development/production)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the service
npm run build

# Run in production
npm start

# Run tests
npm test
```

## Database Schema

The service uses the following Prisma models:

- `Sale`: Main sales transaction record
- `SaleLine`: Individual line items in a sale
- `Refund`: Refund transaction record
- `RefundLine`: Individual line items in a refund
- `User`: Customer/user information (referenced)
- `Store`: Store information (referenced)
- `Product`: Product information (referenced)

## Integration

This service integrates with:
- **API Gateway**: Routes traffic through Kong Gateway
- **Catalog Service**: References products and stores for validation
- **User Service**: Validates customer information
- **Stock Service**: May trigger stock adjustments (future enhancement)

## Error Handling

The service provides structured error responses:
- `400 Bad Request`: Invalid input data or business rule violations
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors

## Business Logic

### Sale Processing
1. Validate user and store exist
2. Calculate total from line items
3. Create sale with 'active' status
4. Generate sale response with calculated totals

### Refund Processing
1. Validate original sale exists and is refundable
2. Check refund amounts don't exceed original sale
3. Update original sale status (refunded/partially_refunded)
4. Create refund record with line items

## Monitoring

Health check endpoint: `GET /health`

Returns:
```json
{
  "status": "healthy",
  "service": "transaction-service"
}
```
