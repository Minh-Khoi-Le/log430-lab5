import { Stock } from '../entities/stock.entity';

export interface StockRepository {
  findById(id: number): Promise<Stock | null>;
  findAll(): Promise<Stock[]>;
  save(stock: Stock): Promise<Stock>;
  update(id: number, stock: Partial<Stock>): Promise<Stock>;
  delete(id: number): Promise<void>;
  findByStoreId(storeId: number): Promise<Stock[]>;
  findByProductId(productId: number): Promise<Stock[]>;
  findByStoreAndProduct(storeId: number, productId: number): Promise<Stock | null>;
  findLowStock(threshold?: number): Promise<Stock[]>;
}
