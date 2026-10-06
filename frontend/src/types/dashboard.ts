export interface InventorySummary {
  low_stock_count: number
  out_of_stock_count: number
  total_products: number
  total_units_in_stock: number
}

export interface DashboardSummary extends InventorySummary {
  total_categories: number
  total_suppliers: number
  total_sales_count: number
  total_revenue: string
}

export interface RecentSale {
  sale_id: number
  total_amount: string
  created_by_id: number
  created_at: string
  /** Number of sale-item lines, not units sold. */
  item_count: number
}

export interface TopProduct {
  product_id: number
  name: string
  sku: string
  units_sold: number
  sales_revenue: string
}

export interface SalesSummary {
  total_sales: number
  total_revenue: string
  average_sale_value: string
  total_units_sold: number
}
