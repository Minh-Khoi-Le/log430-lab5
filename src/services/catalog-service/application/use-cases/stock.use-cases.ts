import { StockRepository } from '../../domain/repositories/stock.repository';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { StoreRepository } from '../../domain/repositories/store.repository';
import { CreateStockDTO, UpdateStockDTO, StockResponseDTO, StockReservationDTO, StockAdjustmentDTO } from '../dtos/stock.dto';
import { Stock } from '../../domain/entities/stock.entity';

export class StockUseCases {
  constructor(
    private readonly stockRepository: StockRepository,
    private readonly productRepository: ProductRepository,
    private readonly storeRepository: StoreRepository
  ) {}

  async createStock(dto: CreateStockDTO): Promise<StockResponseDTO> {
    // Validate store and product exist
    const store = await this.storeRepository.findById(dto.storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if stock already exists
    const existingStock = await this.stockRepository.findByStoreAndProduct(dto.storeId, dto.productId);
    if (existingStock) {
      throw new Error('Stock already exists for this product in this store');
    }

    const stock = new Stock(dto.storeId, dto.productId, dto.quantity);
    const savedStock = await this.stockRepository.save(stock);
    return this.toResponseDTO(savedStock, store.name, product.name, product.price);
  }

  async updateStock(id: number, dto: UpdateStockDTO): Promise<StockResponseDTO> {
    const existingStock = await this.stockRepository.findById(id);
    if (!existingStock) {
      throw new Error('Stock not found');
    }

    existingStock.updateQuantity(dto.quantity);
    const updatedStock = await this.stockRepository.update(id, existingStock);
    
    // Get related data for response
    const store = await this.storeRepository.findById(updatedStock.storeId);
    const product = await this.productRepository.findById(updatedStock.productId);
    
    return this.toResponseDTO(updatedStock, store?.name, product?.name, product?.price);
  }

  async getStock(id: number): Promise<StockResponseDTO> {
    const stock = await this.stockRepository.findById(id);
    if (!stock) {
      throw new Error('Stock not found');
    }
    
    const store = await this.storeRepository.findById(stock.storeId);
    const product = await this.productRepository.findById(stock.productId);
    
    return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
  }

  async getAllStock(): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findAll();
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async getStockByStore(storeId: number): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findByStoreId(storeId);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async getStockByProduct(productId: number): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findByProductId(productId);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async reserveStock(dto: StockReservationDTO): Promise<boolean> {
    const stock = await this.stockRepository.findByStoreAndProduct(dto.storeId, dto.productId);
    if (!stock) {
      throw new Error('Stock not found');
    }

    const success = stock.reserve(dto.quantity);
    if (success) {
      await this.stockRepository.update(stock.id, stock);
    }
    
    return success;
  }

  async adjustStock(dto: StockAdjustmentDTO): Promise<StockResponseDTO> {
    const stock = await this.stockRepository.findByStoreAndProduct(dto.storeId, dto.productId);
    if (!stock) {
      throw new Error('Stock not found');
    }

    if (dto.reason === 'REFUND') {
      stock.restore(dto.quantity);
    } else {
      stock.updateQuantity(dto.quantity);
    }

    const updatedStock = await this.stockRepository.update(stock.id, stock);
    
    const store = await this.storeRepository.findById(updatedStock.storeId);
    const product = await this.productRepository.findById(updatedStock.productId);
    
    return this.toResponseDTO(updatedStock, store?.name, product?.name, product?.price);
  }

  async getLowStockItems(threshold: number = 10): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findLowStock(threshold);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  private toResponseDTO(stock: Stock, storeName?: string, productName?: string, unitPrice?: number): StockResponseDTO {
    return {
      id: stock.id,
      storeId: stock.storeId,
      productId: stock.productId,
      quantity: stock.quantity,
      storeName: storeName ?? '',
      productName: productName ?? '',
      unitPrice: unitPrice ?? 0
    };
  }
}
