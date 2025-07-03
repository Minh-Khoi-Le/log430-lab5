import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import shared caching module
import { redisClient, CacheService, createCacheMiddleware } from '../../shared/infrastructure/caching';
import { createLogger } from '../../shared/infrastructure/logging';

// Import repositories
import { PrismaProductRepository } from './infrastructure/database/prisma-product.repository';
import { PrismaStoreRepository } from './infrastructure/database/prisma-store.repository';
import { PrismaStockRepository } from './infrastructure/database/prisma-stock.repository';

// Import use cases
import { ProductUseCases } from './application/use-cases/product.use-cases';
import { StoreUseCases } from './application/use-cases/store.use-cases';
import { StockUseCases } from './application/use-cases/stock.use-cases';

// Import controllers
import { ProductController } from './infrastructure/http/product.controller';
import { StoreController } from './infrastructure/http/store.controller';
import { StockController } from './infrastructure/http/stock.controller';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(createCacheMiddleware()); // Initialize cache middleware

// Initialize dependencies
const prisma = new PrismaClient();

// Create a logger for the service
const logger = createLogger('catalog-service');

// Initialize Redis and Cache Service
const initializeCache = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error);
    logger.warn('Service will operate without caching');
  }
};

// Call the initialization function
initializeCache().catch(console.error);

// Create cache service with proper service name
const cacheService = new CacheService(redisClient, 'catalog-service');

// Create cache middleware with TTL of 5 minutes for product listings and 10 minutes for individual items
const productListCache = createCacheMiddleware({ 
  cacheService, 
  ttl: 300 // 5 minutes 
});

const productItemCache = createCacheMiddleware({ 
  cacheService, 
  ttl: 600 // 10 minutes
});

// Repositories
const productRepository = new PrismaProductRepository(prisma);
const storeRepository = new PrismaStoreRepository(prisma);
const stockRepository = new PrismaStockRepository(prisma);

// Use cases
const productUseCases = new ProductUseCases(productRepository);
const storeUseCases = new StoreUseCases(storeRepository);
const stockUseCases = new StockUseCases(stockRepository, productRepository, storeRepository);

// Controllers
const productController = new ProductController(productUseCases);
const storeController = new StoreController(storeUseCases);
const stockController = new StockController(stockUseCases);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'catalog-service' });
});

// Product routes
app.post('/api/products', (req, res) => productController.createProduct(req, res));
app.get('/api/products', productListCache, (req, res) => productController.getAllProducts(req, res));
app.get('/api/products/search', productListCache, (req, res) => productController.searchProducts(req, res));
app.get('/api/products/:id', productItemCache, (req, res) => productController.getProduct(req, res));
app.put('/api/products/:id', (req, res) => {
  productController.updateProduct(req, res);
  // Invalidate cache after update
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/products/${id}`);
  cacheService.delete('GET:/api/products');
  cacheService.delete('GET:/api/products/search');
});
app.delete('/api/products/:id', (req, res) => {
  productController.deleteProduct(req, res);
  // Invalidate cache after delete
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/products/${id}`);
  cacheService.delete('GET:/api/products');
  cacheService.delete('GET:/api/products/search');
});

// Store routes
app.post('/api/stores', (req, res) => storeController.createStore(req, res));
app.get('/api/stores', productListCache, (req, res) => storeController.getAllStores(req, res));
app.get('/api/stores/search', productListCache, (req, res) => storeController.searchStores(req, res));
app.get('/api/stores/:id', productItemCache, (req, res) => storeController.getStore(req, res));
app.put('/api/stores/:id', (req, res) => {
  storeController.updateStore(req, res);
  // Invalidate cache after update
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/stores/${id}`);
  cacheService.delete('GET:/api/stores');
  cacheService.delete('GET:/api/stores/search');
});
app.delete('/api/stores/:id', (req, res) => {
  storeController.deleteStore(req, res);
  // Invalidate cache after delete
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/stores/${id}`);
  cacheService.delete('GET:/api/stores');
  cacheService.delete('GET:/api/stores/search');
});

// Stock routes
app.post('/api/stock', (req, res) => stockController.createStock(req, res));
app.get('/api/stock', productListCache, (req, res) => stockController.getAllStock(req, res));
app.get('/api/stock/low', productListCache, (req, res) => stockController.getLowStockItems(req, res));
app.get('/api/stock/:id', productItemCache, (req, res) => stockController.getStock(req, res));
app.put('/api/stock/:id', (req, res) => {
  stockController.updateStock(req, res);
  // Invalidate cache after update
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/stock/${id}`);
  cacheService.delete('GET:/api/stock');
  cacheService.delete('GET:/api/stock/low');
});
app.get('/api/stock/store/:storeId', productListCache, (req, res) => stockController.getStockByStore(req, res));
app.get('/api/stock/product/:productId', productListCache, (req, res) => stockController.getStockByProduct(req, res));
app.post('/api/stock/reserve', (req, res) => {
  stockController.reserveStock(req, res);
  // Invalidate relevant stock caches
  cacheService.delete('GET:/api/stock');
  cacheService.delete('GET:/api/stock/low');
});
app.post('/api/stock/adjust', (req, res) => {
  stockController.adjustStock(req, res);
  // Invalidate relevant stock caches
  cacheService.delete('GET:/api/stock');
  cacheService.delete('GET:/api/stock/low');
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Catalog Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err));
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err));
  process.exit(0);
});

export default app;
