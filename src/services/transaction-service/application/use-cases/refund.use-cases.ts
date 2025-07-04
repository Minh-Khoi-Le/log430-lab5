import { RefundRepository } from '../../domain/repositories/refund.repository';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { CreateRefundDTO, RefundResponseDTO, RefundsSummaryDTO } from '../dtos/refund.dto';
import { Refund } from '../../domain/entities/refund.entity';
import { RefundLine } from '../../domain/entities/refund-line.entity';

export class RefundUseCases {
  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly saleRepository: SaleRepository
  ) {}

  async createRefund(dto: CreateRefundDTO): Promise<RefundResponseDTO> {
    // Validate that the sale exists and is refundable
    const sale = await this.saleRepository.findById(dto.saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (!sale.isRefundable()) {
      throw new Error('Sale is not refundable');
    }

    // Calculate total
    const total = dto.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    
    // Create refund lines
    const refundLines = dto.lines.map((lineDto, index) => 
      new RefundLine(lineDto.productId, lineDto.quantity, lineDto.unitPrice, 0, index)
    );

    // Create refund entity
    const refund = new Refund(
      0, // ID will be assigned by the database
      new Date(),
      total,
      dto.saleId,
      dto.storeId,
      dto.userId,
      refundLines,
      dto.reason
    );

    // Save refund
    const savedRefund = await this.refundRepository.save(refund);

    // Update sale status
    const existingRefunds = await this.refundRepository.findBySaleId(dto.saleId);
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.total, 0) + total;
    
    if (totalRefunded >= sale.total) {
      sale.markAsRefunded();
    } else {
      sale.markAsPartiallyRefunded();
    }
    
    await this.saleRepository.update(dto.saleId, sale);

    return this.toResponseDTO(savedRefund);
  }

  async getRefund(id: number): Promise<RefundResponseDTO> {
    const refund = await this.refundRepository.findById(id);
    if (!refund) {
      throw new Error('Refund not found');
    }
    return this.toResponseDTO(refund);
  }

  async getAllRefunds(): Promise<RefundResponseDTO[]> {
    const refunds = await this.refundRepository.findAll();
    return refunds.map(refund => this.toResponseDTO(refund));
  }

  async getRefundsByUser(userId: number): Promise<RefundResponseDTO[]> {
    if (this.refundRepository.findByUserIdWithRelations) {
      // Use method with relations for full data
      const refundsWithRelations = await this.refundRepository.findByUserIdWithRelations(userId);
      return refundsWithRelations.map(refund => this.toResponseDTOWithRelations(refund));
    } else {
      // Fallback to entity method
      const refunds = await this.refundRepository.findByUserId(userId);
      return refunds.map(refund => this.toResponseDTO(refund));
    }
  }

  async getRefundsByStore(storeId: number): Promise<RefundResponseDTO[]> {
    const refunds = await this.refundRepository.findByStoreId(storeId);
    return refunds.map(refund => this.toResponseDTO(refund));
  }

  async getRefundsBySale(saleId: number): Promise<RefundResponseDTO[]> {
    const refunds = await this.refundRepository.findBySaleId(saleId);
    return refunds.map(refund => this.toResponseDTO(refund));
  }

  async getRefundsSummary(startDate: Date, endDate: Date): Promise<RefundsSummaryDTO> {
    const refunds = await this.refundRepository.findByDateRange(startDate, endDate);
    const sales = await this.saleRepository.findByDateRange(startDate, endDate);
    
    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce((sum, refund) => sum + refund.total, 0);
    const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
    const refundRate = totalSalesAmount > 0 ? (totalRefundAmount / totalSalesAmount) * 100 : 0;

    return {
      totalRefunds,
      totalRefundAmount,
      refundRate,
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };
  }

  private toResponseDTO(refund: Refund): RefundResponseDTO {
    return {
      id: refund.id,
      date: refund.date,
      total: refund.total,
      reason: refund.reason ?? '',
      storeId: refund.storeId,
      userId: refund.userId,
      saleId: refund.saleId,
      lines: refund.lines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.getLineTotal()
      }))
    };
  }

  private toResponseDTOWithRelations(refundData: any): RefundResponseDTO {
    return {
      id: refundData.id,
      date: refundData.date,
      total: refundData.total,
      reason: refundData.reason ?? '',
      storeId: refundData.storeId,
      userId: refundData.userId,
      saleId: refundData.saleId,
      lines: refundData.lines.map((line: any) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.quantity * line.unitPrice,
        product: line.product ? {
          id: line.product.id,
          name: line.product.name,
          price: line.product.price
        } : undefined
      })),
      store: refundData.store ? {
        id: refundData.store.id,
        name: refundData.store.name
      } : undefined,
      user: refundData.user ? {
        id: refundData.user.id,
        name: refundData.user.name
      } : undefined,
      sale: refundData.sale ? {
        id: refundData.sale.id
      } : undefined
    };
  }
}
