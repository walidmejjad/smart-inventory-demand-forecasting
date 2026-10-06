import { DashboardPanel, SectionError, SectionSkeleton } from '@/components/dashboard/dashboard-panel'
import type { DashboardResource } from '@/hooks/use-dashboard'
import { formatAmount, formatCount } from '@/lib/dashboard-format'
import type { SalesSummary } from '@/types/dashboard'

export function SalesPanel({ resource, isLoading }: { resource: DashboardResource<SalesSummary>; isLoading: boolean }) {
  const { data, error } = resource
  return <DashboardPanel title="Sales performance" description="All completed sales · all time">
    {error && <SectionError hasData={!!data} />}
    {data ? <div className="px-5 py-6 sm:px-6">
      <dl className="grid gap-6 sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Average sale value</dt><dd className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums" data-sales-metric="average">{formatAmount(data.average_sale_value)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Units sold</dt><dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums" data-sales-metric="units">{formatCount(data.total_units_sold)}</dd></div>
      </dl>
      <dl className="mt-6 space-y-3 border-t pt-5 text-xs">
        <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Completed sales</dt><dd className="font-medium tabular-nums">{formatCount(data.total_sales)}</dd></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><dt className="text-muted-foreground">Total revenue</dt><dd className="break-all font-medium tabular-nums">{formatAmount(data.total_revenue)}</dd></div>
      </dl>
      {data.total_sales === 0 && <p className="mt-5 text-xs text-muted-foreground">No completed sales yet.</p>}
    </div> : isLoading ? <SectionSkeleton /> : null}
  </DashboardPanel>
}
