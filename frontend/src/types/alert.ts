export interface StockAlert {
  product_id: number
  name: string
  sku: string
  quantity_in_stock: number
  reorder_level: number
  /** Keep future statuses visible instead of silently dropping them. */
  status: string
}

export interface AlertSummary { low_stock_count: number; out_of_stock_count: number }
