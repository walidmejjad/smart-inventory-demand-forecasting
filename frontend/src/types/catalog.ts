export interface CatalogRecord { id: number; name: string; created_at: string; updated_at: string }
export interface CategoryInput { name: string; description: string | null }
export interface Category extends CatalogRecord, CategoryInput {}
export interface SupplierInput { name: string; email: string | null; phone: string | null; address: string | null }
export interface Supplier extends CatalogRecord, SupplierInput {}
export interface ProductInput {
  name: string; sku: string; description: string | null; price: string
  quantity_in_stock: number; reorder_level: number; category_id: number; supplier_id: number
}
export interface Product extends CatalogRecord, ProductInput {}
