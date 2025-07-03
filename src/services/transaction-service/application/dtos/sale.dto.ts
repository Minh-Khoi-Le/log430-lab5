// Sale Data Transfer Objects

export interface CreateSaleDTO {
  userId: number;
  storeId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface SaleLineDTO {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SaleResponseDTO {
  id: number;
  date: Date;
  total: number;
  status: string;
  storeId: number;
  userId: number;
  lines: SaleLineDTO[];
}

export interface SalesSummaryDTO {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  period: string;
}
