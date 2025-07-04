import { SaleRepository } from '../../domain/repositories/sale.repository';
import { CreateSaleDTO, SaleResponseDTO, SalesSummaryDTO } from '../dtos/sale.dto';
import { Sale } from '../../domain/entities/sale.entity';
import { SaleLine } from '../../domain/entities/sale-line.entity';
import axios from 'axios';

export class SaleUseCases {
  constructor(private readonly saleRepository: SaleRepository) {}

  async createSale(dto: CreateSaleDTO): Promise<SaleResponseDTO> {
    // Calculate total
    const total = dto.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    
    // Create sale lines
    const saleLines = dto.lines.map((lineDto, index) => 
      new SaleLine(lineDto.productId, lineDto.quantity, lineDto.unitPrice, 0, index)
    );

    // Create sale entity
    const sale = new Sale(
      0, // ID will be assigned by the database
      new Date(),
      total,
      'active',
      dto.storeId,
      dto.userId,
      saleLines
    );

    // Save sale
    const savedSale = await this.saleRepository.save(sale);

    // Update stock for each product sold
    await this.updateStockAfterSale(dto.storeId, dto.lines);

    return this.toResponseDTO(savedSale);
  }

  async getSale(id: number): Promise<SaleResponseDTO> {
    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw new Error('Sale not found');
    }
    return this.toResponseDTO(sale);
  }

  async getAllSales(): Promise<SaleResponseDTO[]> {
    const sales = await this.saleRepository.findAll();
    return sales.map(sale => this.toResponseDTO(sale));
  }

  async getSalesByUser(userId: number): Promise<SaleResponseDTO[]> {
    if (this.saleRepository.findByUserIdWithRelations) {
      // Use method with relations for full data
      const salesWithRelations = await this.saleRepository.findByUserIdWithRelations(userId);
      return salesWithRelations.map(sale => this.toResponseDTOWithRelations(sale));
    } else {
      // Fallback to entity method
      const sales = await this.saleRepository.findByUserId(userId);
      return sales.map(sale => this.toResponseDTO(sale));
    }
  }

  async getSalesByStore(storeId: number): Promise<SaleResponseDTO[]> {
    const sales = await this.saleRepository.findByStoreId(storeId);
    return sales.map(sale => this.toResponseDTO(sale));
  }

  async updateSaleStatus(id: number, status: string): Promise<SaleResponseDTO> {
    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw new Error('Sale not found');
    }

    sale.status = status;
    const updatedSale = await this.saleRepository.update(id, sale);
    return this.toResponseDTO(updatedSale);
  }

  async getSalesSummary(startDate: Date, endDate: Date): Promise<SalesSummaryDTO> {
    const sales = await this.saleRepository.findByDateRange(startDate, endDate);
    
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };
  }

  private toResponseDTO(sale: Sale): SaleResponseDTO {
    return {
      id: sale.id,
      date: sale.date,
      total: sale.total,
      status: sale.status,
      storeId: sale.storeId,
      userId: sale.userId,
      lines: sale.lines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.getLineTotal()
      }))
    };
  }

  private toResponseDTOWithRelations(saleData: any): SaleResponseDTO {
    return {
      id: saleData.id,
      date: saleData.date,
      total: saleData.total,
      status: saleData.status,
      storeId: saleData.storeId,
      userId: saleData.userId,
      lines: saleData.lines.map((line: any) => ({
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
      store: saleData.store ? {
        id: saleData.store.id,
        name: saleData.store.name
      } : undefined,
      user: saleData.user ? {
        id: saleData.user.id,
        name: saleData.user.name
      } : undefined
    };
  }

  private async updateStockAfterSale(storeId: number, lines: Array<{productId: number, quantity: number}>): Promise<void> {
    const catalogServiceUrl = process.env.CATALOG_SERVICE_URL ?? 'http://catalog-service:3000';
    
    try {
      // Update stock for each product in the sale
      for (const line of lines) {
        const reservationData = {
          storeId: storeId,
          productId: line.productId,
          quantity: line.quantity
        };

        console.log(`Updating stock for product ${line.productId}, quantity: ${line.quantity}`);
        
        const response = await axios.post(`${catalogServiceUrl}/api/stock/reserve`, reservationData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });

        if (!response.data.success) {
          console.error(`Failed to update stock for product ${line.productId}`);
          // Note: In a production system, you might want to implement compensation logic
          // or use a saga pattern to handle partial failures
        } else {
          console.log(`Successfully updated stock for product ${line.productId}`);
        }
      }
    } catch (error) {
      console.error('Error updating stock after sale:', error);
      // In a production system, you might want to:
      // 1. Log this error for monitoring
      // 2. Implement retry logic
      // 3. Use a message queue for reliable stock updates
      // For now, we'll just log the error and continue
    }
  }
}
