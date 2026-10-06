import { Boxes, CircleDollarSign, Package, ReceiptText, type LucideIcon } from 'lucide-react'
import { SectionError } from '@/components/dashboard/dashboard-panel'
import type { DashboardResource } from '@/hooks/use-dashboard'
import { formatAmount, formatCount } from '@/lib/dashboard-format'
import type { DashboardSummary } from '@/types/dashboard'

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return <div className="min-w-0 rounded-xl border bg-card p-5 shadow-card">
    <div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-muted-foreground">{label}</h2><Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" /></div>
    <p className="mt-5 break-words text-[clamp(1.25rem,2.1vw,1.875rem)] leading-tight font-semibold tracking-tight tabular-nums" data-metric={label}>{value}</p>
    <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{detail}</p>
  </div>
}

export function SummaryMetrics({ resource, isLoading }: { resource: DashboardResource<DashboardSummary>; isLoading: boolean }) {
  const { data, error } = resource
  return <section aria-label="Key metrics" aria-busy={isLoading}>
    {error && <div className="mb-4 rounded-lg border bg-card"><SectionError hasData={!!data} /></div>}
    {data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total revenue" value={formatAmount(data.total_revenue)} detail="All completed sales · all time" icon={CircleDollarSign} />
      <Metric label="Completed sales" value={formatCount(data.total_sales_count)} detail="All time" icon={ReceiptText} />
      <Metric label="Total products" value={formatCount(data.total_products)} detail={`${formatCount(data.total_categories)} categories · ${formatCount(data.total_suppliers)} suppliers`} icon={Package} />
      <Metric label="Units in stock" value={formatCount(data.total_units_in_stock)} detail="Current inventory" icon={Boxes} />
    </div> : isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="rounded-xl border bg-card p-5"><div className="h-3 w-24 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-6 h-8 w-32 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-4 h-3 w-28 rounded bg-muted motion-safe:animate-pulse" /></div>)}</div> : null}
  </section>
}
