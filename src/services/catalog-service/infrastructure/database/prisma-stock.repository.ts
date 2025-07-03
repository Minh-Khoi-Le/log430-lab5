import { PrismaClient } from '@prisma/client';
import { StockRepository } from '../../domain/repositories/stock.repository';
import { Stock } from '../../domain/entities/stock.entity';

export class PrismaStockRepository implements StockRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Stock | null> {
    const stock = await this.prisma.stock.findUnique({
      where: { id }
    });
    
    return stock ? new Stock(stock.storeId, stock.productId, stock.quantity, stock.id) : null;
  }

  async findAll(): Promise<Stock[]> {
    const stocks = await this.prisma.stock.findMany();
    return stocks.map((stock: any) => new Stock(stock.storeId, stock.productId, stock.quantity, stock.id));
  }

  async save(stock: Stock): Promise<Stock> {
    const savedStock = await this.prisma.stock.create({
      data: {
        storeId: stock.storeId,
        productId: stock.productId,
        quantity: stock.quantity
      }
    });
    
    return new Stock(savedStock.storeId, savedStock.productId, savedStock.quantity, savedStock.id);
  }

  async update(id: number, stock: Partial<Stock>): Promise<Stock> {
    const updatedStock = await this.prisma.stock.update({
      where: { id },
      data: {
        quantity: stock.quantity
      }
    });
    
    return new Stock(updatedStock.storeId, updatedStock.productId, updatedStock.quantity, updatedStock.id);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.stock.delete({
      where: { id }
    });
  }

  async findByStoreId(storeId: number): Promise<Stock[]> {
    const stocks = await this.prisma.stock.findMany({
      where: { storeId }
    });
    
    return stocks.map((stock: { storeId: number; productId: number; quantity: number; id: number }) => new Stock(stock.storeId, stock.productId, stock.quantity, stock.id));
  }

  async findByProductId(productId: number): Promise<Stock[]> {
    const stocks = await this.prisma.stock.findMany({
      where: { productId }
    });
    
    return stocks.map((stock: { storeId: number; productId: number; quantity: number; id: number }) => new Stock(stock.storeId, stock.productId, stock.quantity, stock.id));
  }

  async findByStoreAndProduct(storeId: number, productId: number): Promise<Stock | null> {
    const stock = await this.prisma.stock.findUnique({
      where: {
        storeId_productId: {
          storeId,
          productId
        }
      }
    });
    
    return stock ? new Stock(stock.storeId, stock.productId, stock.quantity, stock.id) : null;
  }

  async findLowStock(threshold: number = 10): Promise<Stock[]> {
    const stocks = await this.prisma.stock.findMany({
      where: {
        quantity: {
          lt: threshold
        }
      }
    });
    
    return stocks.map((stock: { storeId: number; productId: number; quantity: number; id: number }) => new Stock(stock.storeId, stock.productId, stock.quantity, stock.id));
  }
}
