import { catalogResource } from '@/api/catalog-resource'
import type { Product, ProductInput } from '@/types/catalog'
export const productsApi = catalogResource<Product, ProductInput>('/api/products')
