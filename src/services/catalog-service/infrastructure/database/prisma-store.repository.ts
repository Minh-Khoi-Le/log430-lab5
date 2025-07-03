import { PrismaClient } from '@prisma/client';
import { StoreRepository } from '../../domain/repositories/store.repository';
import { Store } from '../../domain/entities/store.entity';

export class PrismaStoreRepository implements StoreRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Store | null> {
    const store = await this.prisma.store.findUnique({
      where: { id }
    });
    
    return store ? new Store(store.id, store.name, store.address) : null;
  }

  async findAll(): Promise<Store[]> {
    const stores = await this.prisma.store.findMany();
    return stores.map((store: any) => new Store(store.id, store.name, store.address));
  }

  async save(store: Store): Promise<Store> {
    const savedStore = await this.prisma.store.create({
      data: {
        name: store.name,
        address: store.address
      }
    });
    
    return new Store(savedStore.id, savedStore.name, savedStore.address);
  }

  async update(id: number, store: Partial<Store>): Promise<Store> {
    const updatedStore = await this.prisma.store.update({
      where: { id },
      data: {
        name: store.name,
        address: store.address
      }
    });
    
    return new Store(updatedStore.id, updatedStore.name, updatedStore.address);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.store.delete({
      where: { id }
    });
  }

  async findByName(name: string): Promise<Store[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      }
    });
    
    return stores.map((store: { id: number; name: string; address: string }) => new Store(store.id, store.name, store.address));
  }
}
