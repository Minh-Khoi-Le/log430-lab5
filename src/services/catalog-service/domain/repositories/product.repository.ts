import { Product } from '../entities/product.entity';

export interface ProductRepository {
  findById(id: number): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  update(id: number, product: Partial<Product>): Promise<Product>;
  delete(id: number): Promise<void>;
  findByName(name: string): Promise<Product[]>;
}
