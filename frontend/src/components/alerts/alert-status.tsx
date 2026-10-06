import { AlertTriangle, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

import { alertStatusLabel } from '@/lib/alerts'

export function AlertStatus({ status }: { status: string }) {
  const Icon = status === 'OUT_OF_STOCK' ? CircleAlert : AlertTriangle
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium', status === 'OUT_OF_STOCK' ? 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300' : status === 'LOW_STOCK' ? 'border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300' : 'bg-muted/40 text-muted-foreground')}><Icon aria-hidden="true" className="size-3.5 shrink-0" /><span className="break-words">{alertStatusLabel(status)}</span></span>
}

