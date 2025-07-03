import { Store } from '../entities/store.entity';

export interface StoreRepository {
  findById(id: number): Promise<Store | null>;
  findAll(): Promise<Store[]>;
  save(store: Store): Promise<Store>;
  update(id: number, store: Partial<Store>): Promise<Store>;
  delete(id: number): Promise<void>;
  findByName(name: string): Promise<Store[]>;
}
