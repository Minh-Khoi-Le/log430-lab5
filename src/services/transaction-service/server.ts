import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import shared caching module
import { redisClient, CacheService, createCacheMiddleware } from '../../shared/infrastructure/caching';
import { createLogger } from '../../shared/infrastructure/logging';

// Import repositories
import { PrismaSaleRepository } from './infrastructure/database/prisma-sale.repository';
import { PrismaRefundRepository } from './infrastructure/database/prisma-refund.repository';

// Import use cases
import { SaleUseCases } from './application/use-cases/sale.use-cases';
import { RefundUseCases } from './application/use-cases/refund.use-cases';

// Import controllers
import { SaleController } from './infrastructure/http/sale.controller';
import { RefundController } from './infrastructure/http/refund.controller';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize dependencies
const prisma = new PrismaClient();

// Create a logger for the service
const logger = createLogger('transaction-service');

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
initializeCache().catch(err => logger.error('Redis initialization error', err as Error));

// Create cache service with proper service name
const cacheService = new CacheService(redisClient, 'transaction-service');

// Create cache middleware with different TTLs for different types of data
const transactionListCache = createCacheMiddleware({ 
  cacheService, 
  ttl: 300 // 5 minutes for lists
});

const transactionItemCache = createCacheMiddleware({ 
  cacheService, 
  ttl: 600 // 10 minutes for individual items
});

const summaryCache = createCacheMiddleware({
  cacheService,
  ttl: 1800 // 30 minutes for summary data which changes less frequently
});

// Repositories
const saleRepository = new PrismaSaleRepository(prisma);
const refundRepository = new PrismaRefundRepository(prisma);

// Use cases
const saleUseCases = new SaleUseCases(saleRepository);
const refundUseCases = new RefundUseCases(refundRepository, saleRepository);

// Controllers
const saleController = new SaleController(saleUseCases);
const refundController = new RefundController(refundUseCases);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'transaction-service' });
});

// Sale routes
app.post('/api/sales', (req, res) => {
  saleController.createSale(req, res);
  // Invalidate related caches after creation
  cacheService.delete('GET:/api/sales');
  cacheService.delete('GET:/api/sales/summary');
});

app.get('/api/sales', transactionListCache, (req, res) => saleController.getAllSales(req, res));
app.get('/api/sales/summary', summaryCache, (req, res) => saleController.getSalesSummary(req, res));
app.get('/api/sales/:id', transactionItemCache, (req, res) => saleController.getSale(req, res));

app.put('/api/sales/:id/status', (req, res) => {
  saleController.updateSaleStatus(req, res);
  // Invalidate caches after status update
  const id = parseInt(req.params.id);
  cacheService.delete(`GET:/api/sales/${id}`);
  cacheService.delete('GET:/api/sales');
  cacheService.delete('GET:/api/sales/summary');
});

app.get('/api/sales/user/:userId', transactionListCache, (req, res) => saleController.getSalesByUser(req, res));
app.get('/api/sales/store/:storeId', transactionListCache, (req, res) => saleController.getSalesByStore(req, res));

// Refund routes
app.post('/api/refunds', (req, res) => {
  refundController.createRefund(req, res);
  // Invalidate related caches after creation
  cacheService.delete('GET:/api/refunds');
  cacheService.delete('GET:/api/refunds/summary');
  // Also invalidate sales summary since refunds affect it
  cacheService.delete('GET:/api/sales/summary');
});

app.get('/api/refunds', transactionListCache, (req, res) => refundController.getAllRefunds(req, res));
app.get('/api/refunds/summary', summaryCache, (req, res) => refundController.getRefundsSummary(req, res));
app.get('/api/refunds/:id', transactionItemCache, (req, res) => refundController.getRefund(req, res));
app.get('/api/refunds/user/:userId', transactionListCache, (req, res) => refundController.getRefundsByUser(req, res));
app.get('/api/refunds/store/:storeId', transactionListCache, (req, res) => refundController.getRefundsByStore(req, res));
app.get('/api/refunds/sale/:saleId', transactionListCache, (req, res) => refundController.getRefundsBySale(req, res));

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any) => {
  logger.error('Internal server error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Transaction Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err as Error));
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err as Error));
  process.exit(0);
});

export default app;
