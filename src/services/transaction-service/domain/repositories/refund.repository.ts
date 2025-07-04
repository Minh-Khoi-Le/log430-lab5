import { Refund } from '../entities/refund.entity';

export interface RefundRepository {
  findById(id: number): Promise<Refund | null>;
  findAll(): Promise<Refund[]>;
  save(refund: Refund): Promise<Refund>;
  update(id: number, refund: Partial<Refund>): Promise<Refund>;
  delete(id: number): Promise<void>;
  findByUserId(userId: number): Promise<Refund[]>;
  findByStoreId(storeId: number): Promise<Refund[]>;
  findBySaleId(saleId: number): Promise<Refund[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Refund[]>;
  findByUserIdWithRelations?(userId: number): Promise<any[]>;
}
