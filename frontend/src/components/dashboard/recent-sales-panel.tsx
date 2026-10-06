import { DashboardPanel, EmptySection, SectionError, SectionSkeleton } from '@/components/dashboard/dashboard-panel'
import type { DashboardResource } from '@/hooks/use-dashboard'
import { dashboardTimeZone, formatAmount, formatCount, formatSaleDate } from '@/lib/dashboard-format'
import type { RecentSale } from '@/types/dashboard'

export function RecentSalesPanel({ resource, isLoading }: { resource: DashboardResource<RecentSale[]>; isLoading: boolean }) {
  const { data, error } = resource
  return <DashboardPanel title="Recent sales" description={`Latest 5 completed sales · dates in ${dashboardTimeZone}`}>
    {error && <SectionError hasData={!!data} />}
    {data ? data.length ? <div className="overflow-x-auto rounded-b-xl" tabIndex={0} role="region" aria-label="Recent sales table">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Latest completed sales. Item lines are distinct sale entries, not units sold.</caption>
        <thead className="border-b bg-muted/30 text-[10px] text-muted-foreground"><tr><th scope="col" className="px-5 py-3 font-medium sm:px-6">Sale</th><th scope="col" className="px-3 py-3 font-medium">Date</th><th scope="col" className="hidden px-3 py-3 text-right font-medium sm:table-cell">Item lines</th><th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Amount</th></tr></thead>
        <tbody className="divide-y">{data.map((sale) => {
          const created = formatSaleDate(sale.created_at)
          return <tr key={sale.sale_id} className="transition-colors hover:bg-muted/25">
            <th scope="row" className="whitespace-nowrap px-5 py-5 align-top font-medium sm:px-6">#{sale.sale_id}<span className="mt-1.5 block text-[10px] font-normal text-muted-foreground sm:hidden">{formatCount(sale.item_count)} {sale.item_count === 1 ? 'line' : 'lines'}</span></th>
            <td className="px-3 py-5 align-top"><time dateTime={sale.created_at}><span className="block whitespace-nowrap">{created.date}</span><span className="mt-1.5 block text-[10px] text-muted-foreground">{created.time}</span></time></td>
            <td className="hidden px-3 py-5 text-right align-top text-muted-foreground tabular-nums sm:table-cell">{formatCount(sale.item_count)}</td>
            <td className="whitespace-nowrap px-5 py-5 text-right align-top font-medium tabular-nums sm:px-6">{formatAmount(sale.total_amount)}</td>
          </tr>
        })}</tbody>
      </table>
    </div> : <EmptySection message="No completed sales yet. Your latest sales will appear here." /> : isLoading ? <SectionSkeleton rows={5} /> : null}
  </DashboardPanel>
}
