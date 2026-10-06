export interface SaleItem { id: number; product_id: number; quantity: number; unit_price: string; subtotal: string }
export interface Sale { id: number; created_by_id: number; total_amount: string; created_at: string; updated_at: string; items: SaleItem[] }
export interface SaleInput { items: { product_id: number; quantity: number }[] }
