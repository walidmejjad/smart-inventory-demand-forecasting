import { ApiError } from '@/api/errors'
import type { Product } from '@/types/catalog'

export type StockStatus = 'In stock' | 'Low stock' | 'Out of stock'
export function stockStatus(product: Pick<Product, 'quantity_in_stock' | 'reorder_level'>): StockStatus {
  return product.quantity_in_stock === 0 ? 'Out of stock' : product.quantity_in_stock <= product.reorder_level ? 'Low stock' : 'In stock'
}

export function changedFields<T extends object>(input: T, previous: T): Partial<T> {
  const changes: Partial<T> = {}
  for (const key of Object.keys(input) as Array<keyof T>) if (input[key] !== previous[key]) changes[key] = input[key]
  return changes
}

export function catalogError(error: unknown) {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (!error.status || error.status >= 500) return 'Unable to connect to the service. Please try again.'
  const conflicts: Record<string, string> = {
    'Product SKU already exists': 'A product with this SKU already exists. Choose a unique SKU.',
    'Category name already exists': 'A category with this name already exists. Choose another name.',
    'Category is referenced by products': 'This category is used by products. Reassign those products before deleting it.',
    'Supplier is referenced by products': 'This supplier is used by products. Reassign those products before deleting it.',
    'Operation conflicts with existing data': 'This record is linked to existing data or conflicts with another record. It could not be changed.',
  }
  const conflict = conflicts[error.message]
  if (conflict) return conflict
  if (error.status === 404) return 'This record or a selected category/supplier is no longer available. Refresh the list and try again.'
  if (error.status === 422) return 'Some values were rejected. Review the form and try again.'
  if (error.status === 403) return 'Your account does not have permission to perform this action.'
  if (error.status === 401) return 'Your session has expired. Please sign in again.'
  return 'The action could not be completed. Please try again.'
}

export function optionalText(value: string): string | null { return value.trim() ? value : null }
export function fieldAria(name: string, error?: string) { return { 'aria-invalid': !!error, 'aria-describedby': error ? `${name}-error` : undefined } }
export function normalizePrice(value: string) { const [whole = '0', fraction = ''] = value.split('.'); return `${BigInt(whole)}.${fraction.padEnd(2, '0')}` }
