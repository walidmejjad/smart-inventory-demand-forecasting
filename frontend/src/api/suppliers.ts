import { catalogResource } from '@/api/catalog-resource'
import type { Supplier, SupplierInput } from '@/types/catalog'
export const suppliersApi = catalogResource<Supplier, SupplierInput>('/api/suppliers')
