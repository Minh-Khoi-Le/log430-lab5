# Database Seed Data

This directory contains the seed data for the retail management system. The `seed.js` file provides comprehensive demo data for testing and demonstration purposes.

## Data Structure

### Users (2 users as requested)

- **Admin User**:
  - Username: `admin`
  - Password: `admin123`
  - Role: `gestionnaire` (manager)
  
- **Client User**:
  - Username: `client`
  - Password: `client123`
  - Role: `client`
  - Assigned to: Downtown Store

### Products (25+ products as requested)

The seed includes 25 diverse products across multiple categories:

- Electronics (headphones, smartwatches, keyboards, etc.)
- Clothing (t-shirts, shoes)
- Appliances (coffee makers, air purifiers)
- Furniture (office chairs)
- Sports (yoga mats, resistance bands)
- Kitchen (knife sets, cutting boards)
- Home (pillows, diffusers)

### Stores (3 stores)

- Downtown Store
- Mall Store  
- Airport Store

### Additional Data

- **Inventory**: Stock levels for products across stores
- **Sales**: Sample sales transactions
- **Refunds**: Sample refund records
- **Dashboard Stats**: Calculated metrics for the dashboard
- **Recent Activities**: Sample activity feed data
- **Top Products**: Best-selling products with sales metrics

## Usage

### Frontend Integration

The frontend has been updated to fetch data from API endpoints instead of using hardcoded data:

```javascript
// Dashboard endpoints now available
API_ENDPOINTS.DASHBOARD.STATS
API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES  
API_ENDPOINTS.DASHBOARD.TOP_PRODUCTS
```

### Login Credentials

Updated login page shows the correct demo credentials:

- Admin: `admin` / `admin123`
- Client: `client` / `client123`

### Backend Implementation

To use this seed data in your backend:

```javascript
import { seedDatabase, users, products, stores } from './seed.js';

// Seed the database
await seedDatabase();

// Or use individual data arrays
console.log('Products:', products);
console.log('Users:', users);
```

### API Endpoints to Implement

Based on the frontend expectations, implement these endpoints in your backend:

```
GET /dashboard/stats           - Returns dashboardStats
GET /dashboard/activities      - Returns recentActivities  
GET /dashboard/top-products    - Returns topProducts
GET /products                  - Returns products array
GET /stores                    - Returns stores array
GET /sales                     - Returns sales array
GET /refunds                   - Returns refunds array
POST /auth/login               - Validates against users array
```

## Docker Container Seeding

The seeding has been integrated into the main docker-compose.yml for easy deployment.

### Quick Start

**Windows:**

```batch
# Normal seeding (skips if data exists)
scripts\seed-database.bat

# Force seeding (clears existing data)
scripts\seed-database.bat force
```

**Linux/macOS:**

```bash
# Normal seeding (skips if data exists)
./scripts/seed-database.sh

# Force seeding (clears existing data)  
./scripts/seed-database.sh force
```

### Manual Docker Commands

**Normal seeding:**

```bash
docker compose run --rm db-seed
```

**Force seeding:**

```bash
docker compose run --rm db-seed node seed.js --force
```

### Container Features

- **Manual/On-Demand**: Run the seeder container only when you need it
- **Integrated Setup**: Part of main docker-compose.yml
- **Safety Checks**: Normal mode skips seeding if data already exists
- **Force Mode**: `--force` flag clears existing data and reseeds
- **Health Checks**: Waits for database to be ready before seeding
- **Error Handling**: Comprehensive error reporting and logging
- **Simple Usage**: Single service, no profiles required

## Data Relationships

- Users can be assigned to stores (clients only)
- Products exist in inventory across multiple stores
- Sales link customers, products, and stores
- Refunds reference original sales
- Dashboard stats are calculated from the underlying data

## Next Steps

1. Implement backend API endpoints that serve this seed data
2. Connect your database to persist this data
3. Add data validation and error handling
4. Extend with additional demo data as needed

The frontend is now prepared to consume real API data instead of hardcoded values!
