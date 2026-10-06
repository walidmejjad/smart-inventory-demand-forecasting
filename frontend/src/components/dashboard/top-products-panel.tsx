import { DashboardPanel, EmptySection, SectionError, SectionSkeleton } from '@/components/dashboard/dashboard-panel'
import type { DashboardResource } from '@/hooks/use-dashboard'
import { formatAmount, formatCount } from '@/lib/dashboard-format'
import type { TopProduct } from '@/types/dashboard'

export function TopProductsPanel({ resource, isLoading }: { resource: DashboardResource<TopProduct[]>; isLoading: boolean }) {
  const { data, error } = resource
  const maximum = Math.max(0, ...(data ?? []).map((product) => product.units_sold))
  return <DashboardPanel title="Top products" description="Top 5 by units sold · all time">
    {error && <SectionError hasData={!!data} />}
    {data ? data.length ? <ol className="divide-y px-5 sm:px-6">{data.map((product, index) => <li key={product.product_id} className="flex gap-3 py-5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><p className="min-w-0 break-words text-xs font-medium">{product.name}</p><span className="text-xs font-medium tabular-nums">{formatCount(product.units_sold)} units</span></div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span className="break-all">{product.sku}</span><span className="break-all tabular-nums">{formatAmount(product.sales_revenue)} revenue</span></div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-chart-1/75" style={{ width: `${maximum ? product.units_sold / maximum * 100 : 0}%` }} /></div>
      </div>
    </li>)}</ol> : <EmptySection message="Products will appear here after their first sale." /> : isLoading ? <SectionSkeleton rows={5} /> : null}
  </DashboardPanel>
}
