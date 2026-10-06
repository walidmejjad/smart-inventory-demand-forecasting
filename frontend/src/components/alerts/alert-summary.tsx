import { formatCount } from '@/lib/dashboard-format'
import type { AlertSummary as Summary } from '@/types/alert'

export function AlertSummary({ data, loading }: { data: Summary | null; loading: boolean }) {
  const values = [
    { label: 'Total alerts', value: data ? data.low_stock_count + data.out_of_stock_count : null, hint: 'Products needing stock attention' },
    { label: 'Out of stock', value: data?.out_of_stock_count ?? null, hint: 'No units currently available' },
    { label: 'Low stock', value: data?.low_stock_count ?? null, hint: 'Available stock at or below reorder level' },
  ]
  return <dl className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Alert summary" aria-busy={loading}>{values.map((item) => <div key={item.label} className="min-w-0 rounded-xl border bg-card px-4 py-4"><dt className="text-xs font-medium text-muted-foreground">{item.label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{loading && !data ? <span role="status" aria-label={`Loading ${item.label.toLowerCase()}`} className="block h-8 w-14 rounded bg-muted motion-safe:animate-pulse" /> : item.value !== null ? formatCount(item.value) : '—'}</dd><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{item.hint}</p></div>)}</dl>
}
