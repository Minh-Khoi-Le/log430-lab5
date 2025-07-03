# LOG430 Lab 5 Scripts

This directory contains utility scripts for managing the LOG430 Lab 5 microservices architecture.

## Available Scripts

- `quick-start.bat` - Starts all services (Redis, microservices, Kong API Gateway, web client)
- `stop-all.bat` - Stops all services and cleans up Docker resources
- `reset-cache.bat` - Resets the Redis cache container (useful for clearing all cached data)

## Usage

### Quick Start

To start the entire system in one command:

```batch
.\quick-start.bat
```

This will:

1. Start Redis for caching
2. Start all microservices (User, Catalog, Transaction)
3. Start Kong API Gateway
4. Start the web client

### Stopping All Services

To stop all services and clean up:

```batch
.\stop-all.bat
```

### Resetting the Cache

To reset the Redis cache (clear all cached data):

```batch
.\reset-cache.bat
```

This will stop and remove the existing Redis container, then start a fresh one.

## Access Points

After starting the system:

- Web Client: [http://localhost:5173](http://localhost:5173)
- API Gateway: [http://localhost:8000](http://localhost:8000)
- API Admin: [http://localhost:8001](http://localhost:8001)

## Troubleshooting

If services fail to start:

1. Try stopping all services first: `.\stop-all.bat`
2. Check Docker logs: `docker-compose logs -f [service-name]`
3. Ensure Redis is running: `docker ps | grep redis-cache`
4. Check if required ports are available (3001-3003, 5173, 6379, 8000, 8001)

If experiencing cache-related issues:

1. Reset the Redis cache: `.\reset-cache.bat`
2. Restart the affected service(s) to reconnect to Redis: `docker-compose restart [service-name]`
