import { formatCount } from '@/lib/dashboard-format'
import type { SupportedMovementType } from '@/types/inventory-movement'

export const supportedMovementTypes: SupportedMovementType[] = ['SALE', 'RESTOCK', 'ADJUSTMENT']
export function movementTypeLabel(value: string) {
  return value.trim().replace(/[_-]+/g, ' ').toLocaleLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase()) || 'Unknown'
}
export function signedQuantity(value: number) { return `${value > 0 ? '+' : ''}${formatCount(value)}` }
export function positiveId(value: string) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}
