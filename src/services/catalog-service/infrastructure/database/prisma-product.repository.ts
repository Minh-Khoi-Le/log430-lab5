import { PrismaClient } from '@prisma/client';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id }
    });
    
    return product ? new Product(product.id, product.name, product.price, product.description ?? undefined) : null;
  }

  async findAll(): Promise<Product[]> {
    const products = await this.prisma.product.findMany();
    return products.map((product: any) => new Product(product.id, product.name, product.price, product.description ?? undefined));
  }

  async save(product: Product): Promise<Product> {
    const savedProduct = await this.prisma.product.create({
      data: {
        name: product.name,
        price: product.price,
        description: product.description
      }
    });
    
    return new Product(savedProduct.id, savedProduct.name, savedProduct.price, savedProduct.description ?? undefined);
  }

  async update(id: number, product: Partial<Product>): Promise<Product> {
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        name: product.name,
        price: product.price,
        description: product.description
      }
    });
    
    return new Product(updatedProduct.id, updatedProduct.name, updatedProduct.price, updatedProduct.description ?? undefined);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.product.delete({
      where: { id }
    });
  }

  async findByName(name: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      }
    });
    
    return products.map((product: { id: number; name: string; price: number; description: string | null }) => new Product(product.id, product.name, product.price, product.description ?? undefined));
  }
}
