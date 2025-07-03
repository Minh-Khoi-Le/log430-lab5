import { PrismaClient } from '@prisma/client';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { Sale } from '../../domain/entities/sale.entity';
import { SaleLine } from '../../domain/entities/sale-line.entity';

export class PrismaSaleRepository implements SaleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Sale | null> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        lines: true
      }
    });
    
    if (!sale) return null;

    const saleLines = sale.lines.map((line: any) => 
      new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
    );

    return new Sale(
      sale.id,
      sale.date,
      sale.total,
      sale.status,
      sale.storeId,
      sale.userId,
      saleLines
    );
  }

  async findAll(): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      include: {
        lines: true
      }
    });
    
    return sales.map((sale: any) => {
      const saleLines = sale.lines.map((line: any) => 
        new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
      );

      return new Sale(
        sale.id,
        sale.date,
        sale.total,
        sale.status,
        sale.storeId,
        sale.userId,
        saleLines
      );
    });
  }

  async save(sale: Sale): Promise<Sale> {
    const savedSale = await this.prisma.sale.create({
      data: {
        date: sale.date,
        total: sale.total,
        status: sale.status,
        storeId: sale.storeId,
        userId: sale.userId,
        lines: {
          create: sale.lines.map(line => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice
          }))
        }
      },
      include: {
        lines: true
      }
    });

    const saleLines = savedSale.lines.map((line: any) => 
      new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
    );

    return new Sale(
      savedSale.id,
      savedSale.date,
      savedSale.total,
      savedSale.status,
      savedSale.storeId,
      savedSale.userId,
      saleLines
    );
  }

  async update(id: number, sale: Partial<Sale>): Promise<Sale> {
    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: {
        status: sale.status,
        total: sale.total
      },
      include: {
        lines: true
      }
    });

    const saleLines = updatedSale.lines.map((line: any) => 
      new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
    );

    return new Sale(
      updatedSale.id,
      updatedSale.date,
      updatedSale.total,
      updatedSale.status,
      updatedSale.storeId,
      updatedSale.userId,
      saleLines
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.sale.delete({
      where: { id }
    });
  }

  async findByUserId(userId: number): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      where: { userId },
      include: {
        lines: true
      }
    });

    return sales.map((sale: any) => {
      const saleLines = sale.lines.map((line: any) => 
        new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
      );

      return new Sale(
        sale.id,
        sale.date,
        sale.total,
        sale.status,
        sale.storeId,
        sale.userId,
        saleLines
      );
    });
  }

  async findByStoreId(storeId: number): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      where: { storeId },
      include: {
        lines: true
      }
    });

    return sales.map((sale: any) => {
      const saleLines = sale.lines.map((line: any) => 
        new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
      );

      return new Sale(
        sale.id,
        sale.date,
        sale.total,
        sale.status,
        sale.storeId,
        sale.userId,
        saleLines
      );
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        lines: true
      }
    });

    return sales.map((sale: any) => {
      const saleLines = sale.lines.map((line: any) => 
        new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
      );

      return new Sale(
        sale.id,
        sale.date,
        sale.total,
        sale.status,
        sale.storeId,
        sale.userId,
        saleLines
      );
    });
  }
}
