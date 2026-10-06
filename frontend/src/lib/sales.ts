import { ApiError } from '@/api/errors'
import type { Product } from '@/types/catalog'

export function lineCents(price: string, quantity: number): bigint {
  const [whole = '0', fraction = ''] = price.split('.')
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))) * BigInt(quantity)
}
export function centsAmount(cents: bigint) { return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}` }
export function validQuantity(value: string, stock: number) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= Math.min(stock, 2147483647)
}
export function saleError(error: unknown, products: Product[]) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      const id = /Insufficient stock for product (\d+)/i.exec(error.message)?.[1]
      const product = products.find((item) => item.id === Number(id))
      return `Not enough stock is available for ${product?.name ?? 'this product'}. Review the refreshed stock and quantities.`
    }
    if (error.status === 404) return 'A selected product is no longer available. Review the refreshed product list.'
    if (error.status === 422) return 'The sale could not be completed. Review the items and quantities.'
    if (!error.status || error.status >= 500) return 'The sale could not be confirmed. Check sales history before trying again to avoid a duplicate transaction.'
  }
  return 'The sale could not be completed. Please try again.'
}
