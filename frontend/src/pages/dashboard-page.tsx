import { RefreshCw } from 'lucide-react'
import { InventoryPanel } from '@/components/dashboard/inventory-panel'
import { RecentSalesPanel } from '@/components/dashboard/recent-sales-panel'
import { SalesPanel } from '@/components/dashboard/sales-panel'
import { SummaryMetrics } from '@/components/dashboard/summary-metrics'
import { TopProductsPanel } from '@/components/dashboard/top-products-panel'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/hooks/use-dashboard'
import { formatCheckedTime } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const dashboard = useDashboard()
  const hasErrors = [dashboard.summary, dashboard.inventory, dashboard.sales, dashboard.recentSales, dashboard.topProducts].some((resource) => resource.error)
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Your workspace</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Overview</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Inventory today. Sales across all time.</p></div>
      <div className="flex flex-col items-end gap-2">
        <Button variant="outline" onClick={dashboard.refresh} disabled={dashboard.isLoading} aria-label="Refresh dashboard"><RefreshCw className={cn('size-3.5', dashboard.isLoading && 'motion-safe:animate-spin')} aria-hidden="true" />{dashboard.isLoading ? 'Refreshing…' : 'Refresh'}</Button>
        {dashboard.checkedAt && <span className="text-[10px] text-muted-foreground">Last checked {formatCheckedTime(dashboard.checkedAt)}</span>}
      </div>
    </div>
    <p role="status" className="sr-only">{dashboard.isLoading ? 'Loading dashboard data.' : hasErrors ? 'Some dashboard sections could not be loaded. Refresh to retry.' : 'Dashboard data loaded.'}</p>
    <SummaryMetrics resource={dashboard.summary} isLoading={dashboard.isLoading} />
    <div className="grid gap-5 xl:grid-cols-2"><InventoryPanel resource={dashboard.inventory} isLoading={dashboard.isLoading} /><SalesPanel resource={dashboard.sales} isLoading={dashboard.isLoading} /></div>
    <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_1fr]"><RecentSalesPanel resource={dashboard.recentSales} isLoading={dashboard.isLoading} /><TopProductsPanel resource={dashboard.topProducts} isLoading={dashboard.isLoading} /></div>
    <p className="text-[11px] leading-5 text-muted-foreground">Amounts are shown without a currency symbol. Sales figures include all completed sales recorded in this environment.</p>
  </div>
}
