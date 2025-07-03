import { StoreRepository } from '../../domain/repositories/store.repository';
import { CreateStoreDTO, UpdateStoreDTO, StoreResponseDTO } from '../dtos/store.dto';
import { Store } from '../../domain/entities/store.entity';

export class StoreUseCases {
  constructor(private readonly storeRepository: StoreRepository) {}

  async createStore(dto: CreateStoreDTO): Promise<StoreResponseDTO> {
    const store = new Store(0, dto.name, dto.address);
    
    if (!store.isValid()) {
      throw new Error('Invalid store data');
    }

    const savedStore = await this.storeRepository.save(store);
    return this.toResponseDTO(savedStore);
  }

  async updateStore(id: number, dto: UpdateStoreDTO): Promise<StoreResponseDTO> {
    const existingStore = await this.storeRepository.findById(id);
    if (!existingStore) {
      throw new Error('Store not found');
    }

    existingStore.updateDetails(dto.name, dto.address);
    const updatedStore = await this.storeRepository.update(id, existingStore);
    return this.toResponseDTO(updatedStore);
  }

  async getStore(id: number): Promise<StoreResponseDTO> {
    const store = await this.storeRepository.findById(id);
    if (!store) {
      throw new Error('Store not found');
    }
    return this.toResponseDTO(store);
  }

  async getAllStores(): Promise<StoreResponseDTO[]> {
    const stores = await this.storeRepository.findAll();
    return stores.map(store => this.toResponseDTO(store));
  }

  async deleteStore(id: number): Promise<void> {
    const store = await this.storeRepository.findById(id);
    if (!store) {
      throw new Error('Store not found');
    }
    await this.storeRepository.delete(id);
  }

  async searchStores(name: string): Promise<StoreResponseDTO[]> {
    const stores = await this.storeRepository.findByName(name);
    return stores.map(store => this.toResponseDTO(store));
  }

  private toResponseDTO(store: Store): StoreResponseDTO {
    return {
      id: store.id,
      name: store.name,
      address: store.address ?? ''
    };
  }
}
