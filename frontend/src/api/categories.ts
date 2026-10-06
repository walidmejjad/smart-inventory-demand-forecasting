import { catalogResource } from '@/api/catalog-resource'
import type { Category, CategoryInput } from '@/types/catalog'
export const categoriesApi = catalogResource<Category, CategoryInput>('/api/categories')
