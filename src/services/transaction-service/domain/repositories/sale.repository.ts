import { Sale } from '../entities/sale.entity';

export interface SaleRepository {
  findById(id: number): Promise<Sale | null>;
  findAll(): Promise<Sale[]>;
  save(sale: Sale): Promise<Sale>;
  update(id: number, sale: Partial<Sale>): Promise<Sale>;
  delete(id: number): Promise<void>;
  findByUserId(userId: number): Promise<Sale[]>;
  findByStoreId(storeId: number): Promise<Sale[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
  findByUserIdWithRelations?(userId: number): Promise<any[]>;
}
