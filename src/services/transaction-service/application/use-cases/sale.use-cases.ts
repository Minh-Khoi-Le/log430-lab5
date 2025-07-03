import { SaleRepository } from '../../domain/repositories/sale.repository';
import { CreateSaleDTO, SaleResponseDTO, SalesSummaryDTO } from '../dtos/sale.dto';
import { Sale } from '../../domain/entities/sale.entity';
import { SaleLine } from '../../domain/entities/sale-line.entity';

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
    const sales = await this.saleRepository.findByUserId(userId);
    return sales.map(sale => this.toResponseDTO(sale));
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
}
