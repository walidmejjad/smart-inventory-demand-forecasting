export function alertStatusLabel(status: string) {
  if (status === 'OUT_OF_STOCK') return 'Out of stock'
  if (status === 'LOW_STOCK') return 'Low stock'
  return status.trim().replace(/[_-]+/g, ' ').toLocaleLowerCase().replace(/^./u, (letter) => letter.toLocaleUpperCase()) || 'Unknown status'
}
export function alertPriority(status: string) { return status === 'OUT_OF_STOCK' ? 0 : status === 'LOW_STOCK' ? 1 : 2 }


