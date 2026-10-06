import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatSaleDate } from '@/lib/dashboard-format'
import { movementTypeLabel, signedQuantity } from '@/lib/inventory-movements'
import { cn } from '@/lib/utils'

export function MovementBadge({ type }: { type: string }) {
  return <span className="inline-flex max-w-full break-words rounded-md border bg-muted/40 px-2 py-1 text-[10px] font-medium">{movementTypeLabel(type)}</span>
}

export function QuantityChange({ value }: { value: number }) {
  const Icon = value < 0 ? ArrowDownRight : value > 0 ? ArrowUpRight : Minus
  return <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium tabular-nums', value < 0 ? 'text-red-700 dark:text-red-300' : value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}><Icon aria-hidden="true" className="size-3.5" /><span className="sr-only">{value < 0 ? 'Decrease: ' : value > 0 ? 'Increase: ' : 'No change: '}</span>{signedQuantity(value)}</span>
}

export function MovementDate({ value }: { value: string }) {
  const date = formatSaleDate(value)
  return <time dateTime={value} className="inline-flex flex-wrap gap-x-2 gap-y-1"><span>{date.date}</span><span className="text-muted-foreground">{date.time}</span></time>
}
