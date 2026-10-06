import { DashboardPanel, SectionError, SectionSkeleton } from '@/components/dashboard/dashboard-panel'
import type { DashboardResource } from '@/hooks/use-dashboard'
import { formatCount } from '@/lib/dashboard-format'
import type { InventorySummary } from '@/types/dashboard'

export function InventoryPanel({ resource, isLoading }: { resource: DashboardResource<InventorySummary>; isLoading: boolean }) {
  const { data, error } = resource
  const statuses = data ? [
    { label: 'Above reorder level', count: Math.max(0, data.total_products - data.low_stock_count - data.out_of_stock_count), color: 'bg-chart-1' },
    { label: 'Low stock', count: data.low_stock_count, color: 'bg-chart-3' },
    { label: 'Out of stock', count: data.out_of_stock_count, color: 'bg-destructive' },
  ] : []

  return <DashboardPanel title="Inventory health" description="Current product stock status">
    {error && <SectionError hasData={!!data} />}
    {data ? <div className="px-5 py-6 sm:px-6">
      <div className="flex items-baseline gap-2"><span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCount(data.total_products)}</span><span className="text-xs text-muted-foreground">products in the catalog</span></div>
      {data.total_products > 0 ? <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">{statuses.map(({ label, count, color }) => <span key={label} className={color} style={{ width: `${count / data.total_products * 100}%` }} />)}</div> : <p className="mt-4 text-xs text-muted-foreground">No products in the inventory yet.</p>}
      <dl className="mt-5 space-y-3.5">{statuses.map(({ label, count, color }) => <div key={label} className="flex items-center justify-between gap-3 text-xs"><dt className="flex items-center gap-2.5 text-muted-foreground"><span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />{label}</dt><dd className="font-medium tabular-nums" data-stock-status={label}>{formatCount(count)}</dd></div>)}</dl>
      <p className="mt-5 border-t pt-4 text-[11px] leading-5 text-muted-foreground">{formatCount(data.total_units_in_stock)} units currently in stock. Low stock counts products with a positive quantity at or below their reorder level.</p>
    </div> : isLoading ? <SectionSkeleton /> : null}
  </DashboardPanel>
}
