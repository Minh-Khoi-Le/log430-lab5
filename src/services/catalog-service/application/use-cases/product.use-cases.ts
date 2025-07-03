import { ProductRepository } from '../../domain/repositories/product.repository';
import { CreateProductDTO, UpdateProductDTO, ProductResponseDTO } from '../dtos/product.dto';
import { Product } from '../../domain/entities/product.entity';

export class ProductUseCases {
  constructor(private readonly productRepository: ProductRepository) {}

  async createProduct(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    const product = new Product(0, dto.name, dto.price, dto.description);
    
    if (!product.isValid()) {
      throw new Error('Invalid product data');
    }

    const savedProduct = await this.productRepository.save(product);
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
