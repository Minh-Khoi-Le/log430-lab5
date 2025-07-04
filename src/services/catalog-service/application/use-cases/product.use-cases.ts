import { ProductRepository } from '../../domain/repositories/product.repository';
import { StoreRepository } from '../../domain/repositories/store.repository';
import { StockRepository } from '../../domain/repositories/stock.repository';
import { CreateProductDTO, UpdateProductDTO, ProductResponseDTO } from '../dtos/product.dto';
import { Product } from '../../domain/entities/product.entity';
import { Stock } from '../../domain/entities/stock.entity';

export class ProductUseCases {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly storeRepository: StoreRepository,
    private readonly stockRepository: StockRepository
  ) {}

  async createProduct(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    const product = new Product(0, dto.name, dto.price, dto.description);
    
    if (!product.isValid()) {
      throw new Error('Invalid product data');
    }

    const savedProduct = await this.productRepository.save(product);

    // Create stock record for every store
    const stores = await this.storeRepository.findAll();
    await Promise.all(
      stores.map(store =>
        this.stockRepository.save(new Stock(store.id, savedProduct.id, 0))
      )
    );

    return this.toResponseDTO(savedProduct);
  }

  async updateProduct(id: number, dto: UpdateProductDTO): Promise<ProductResponseDTO> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    if (dto.price !== undefined) {
      existingProduct.updatePrice(dto.price);
    }
    
    if (dto.name !== undefined || dto.description !== undefined) {
      existingProduct.updateDetails(dto.name, dto.description);
    }

    const updatedProduct = await this.productRepository.update(id, existingProduct);
    return this.toResponseDTO(updatedProduct);
  }

  async getProduct(id: number): Promise<ProductResponseDTO> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return this.toResponseDTO(product);
  }

  async getAllProducts(): Promise<ProductResponseDTO[]> {
    const products = await this.productRepository.findAll();
    return products.map(product => this.toResponseDTO(product));
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    // Delete all stock records for this product before deleting the product itself
    const stocks = await this.stockRepository.findByProductId(id);
    await Promise.all(stocks.map(stock => this.stockRepository.delete(stock.id)));
    await this.productRepository.delete(id);
  }

  async searchProducts(name: string): Promise<ProductResponseDTO[]> {
    const products = await this.productRepository.findByName(name);
    return products.map(product => this.toResponseDTO(product));
  }

  private toResponseDTO(product: Product): ProductResponseDTO {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description ?? ''
    };
  }
}
