import { PrismaClient } from '@prisma/client';
import { RefundRepository } from '../../domain/repositories/refund.repository';
import { Refund } from '../../domain/entities/refund.entity';
import { RefundLine } from '../../domain/entities/refund-line.entity';

export class PrismaRefundRepository implements RefundRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Refund | null> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        lines: true
      }
    });
    
    if (!refund) return null;

    const refundLines = refund.lines.map((line: any) => 
      new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
    );

    return new Refund(
      refund.id,
      refund.date,
      refund.total,
      refund.saleId,
      refund.storeId,
      refund.userId,
      refundLines,
      refund.reason ?? undefined
    );
  }

  async findAll(): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany({
      include: {
        lines: true
      }
    });
    
    return refunds.map((refund: any) => {
      const refundLines = refund.lines.map((line: any) => 
        new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
      );

      return new Refund(
        refund.id,
        refund.date,
        refund.total,
        refund.saleId,
        refund.storeId,
        refund.userId,
        refundLines,
        refund.reason ?? undefined
      );
    });
  }

  async save(refund: Refund): Promise<Refund> {
    const savedRefund = await this.prisma.refund.create({
      data: {
        date: refund.date,
        total: refund.total,
        reason: refund.reason,
        saleId: refund.saleId,
        storeId: refund.storeId,
        userId: refund.userId,
        lines: {
          create: refund.lines.map(line => ({
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

    const refundLines = savedRefund.lines.map((line: any) => 
      new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
    );

    return new Refund(
      savedRefund.id,
      savedRefund.date,
      savedRefund.total,
      savedRefund.saleId,
      savedRefund.storeId,
      savedRefund.userId,
      refundLines,
      savedRefund.reason ?? undefined
    );
  }

  async update(id: number, refund: Partial<Refund>): Promise<Refund> {
    const updatedRefund = await this.prisma.refund.update({
      where: { id },
      data: {
        reason: refund.reason,
        total: refund.total
      },
      include: {
        lines: true
      }
    });

    const refundLines = updatedRefund.lines.map((line: any) => 
      new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
    );

    return new Refund(
      updatedRefund.id,
      updatedRefund.date,
      updatedRefund.total,
      updatedRefund.saleId,
      updatedRefund.storeId,
      updatedRefund.userId,
      refundLines,
      updatedRefund.reason ?? undefined
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.refund.delete({
      where: { id }
    });
  }

  async findByUserId(userId: number): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany({
      where: { userId },
      include: {
        lines: true
      }
    });

    return refunds.map((refund: any) => {
      const refundLines = refund.lines.map((line: any) => 
        new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
      );

      return new Refund(
        refund.id,
        refund.date,
        refund.total,
        refund.saleId,
        refund.storeId,
        refund.userId,
        refundLines,
        refund.reason ?? undefined
      );
    });
  }

  async findByStoreId(storeId: number): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany({
      where: { storeId },
      include: {
        lines: true
      }
    });

    return refunds.map((refund: any) => {
      const refundLines = refund.lines.map((line: any) => 
        new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
      );

      return new Refund(
        refund.id,
        refund.date,
        refund.total,
        refund.saleId,
        refund.storeId,
        refund.userId,
        refundLines,
        refund.reason ?? undefined
      );
    });
  }

  async findBySaleId(saleId: number): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany({
      where: { saleId },
      include: {
        lines: true
      }
    });

    return refunds.map((refund: any) => {
      const refundLines = refund.lines.map((line: any) => 
        new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
      );

      return new Refund(
        refund.id,
        refund.date,
        refund.total,
        refund.saleId,
        refund.storeId,
        refund.userId,
        refundLines,
        refund.reason ?? undefined
      );
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany({
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

    return refunds.map((refund: any) => {
      const refundLines = refund.lines.map((line: any) => 
        new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
      );

      return new Refund(
        refund.id,
        refund.date,
        refund.total,
        refund.saleId,
        refund.storeId,
        refund.userId,
        refundLines,
        refund.reason ?? undefined
      );
    });
  }

  async findByUserIdWithRelations(userId: number): Promise<any[]> {
    return await this.prisma.refund.findMany({
      where: { userId },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        store: true,
        user: true,
        sale: true
      }
    });
  }
}
