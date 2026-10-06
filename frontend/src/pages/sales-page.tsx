import { useState } from 'react'
import { Plus, RefreshCw, Search, Receipt } from 'lucide-react'
import { SALES_PAGE_SIZE } from '@/api/sales'
import { productsApi } from '@/api/products'
import { CatalogFeedback, CatalogLoadError, CatalogSkeleton, TableFrame } from '@/components/catalog/catalog-ui'
import { RecordDialog } from '@/components/catalog/record-dialogs'
import { SaleBuilder } from '@/components/sales/sale-builder'
import { SaleDetails } from '@/components/sales/sale-details'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/hooks/use-catalog'
import { useSalesHistory } from '@/hooks/use-sales-history'
import { dashboardTimeZone, formatAmount, formatCount, formatSaleDate } from '@/lib/dashboard-format'
import type { Sale } from '@/types/sales'

export function SalesPage() {
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const query = search.trim().replace(/^#/, '')
  const sales = useSalesHistory(offset, query)
  const products = useCatalog(productsApi)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const filtered = sales.data?.items ?? []
  function start() { products.refresh(); setCreating(true) }
  function complete(sale: Sale) {
    setCreating(false); setFeedback(`Sale #${sale.id} completed successfully. Total: ${formatAmount(sale.total_amount)}.`)
    setOffset(0); sales.refresh(); products.refresh(); setViewing(sale.id)
  }
  function saleDate(sale: Sale) { const date = formatSaleDate(sale.created_at); return <><span>{date.date}</span><span className="ml-2 text-muted-foreground">{date.time}</span></> }
  return <div>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Transactions</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Sales</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Create transactions and review completed sales.</p></div><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh sales" disabled={sales.loading} onClick={sales.refresh}><RefreshCw aria-hidden="true" /></Button><Button data-catalog-primary-action onClick={start}><Plus aria-hidden="true" />New sale</Button></div></div>
    <CatalogFeedback message={feedback} onDismiss={() => setFeedback('')} />
    {sales.error && <CatalogLoadError title="Sales" stale={!!sales.data} onRetry={sales.refresh} />}
    <div className="relative mb-5 max-w-sm"><label htmlFor="sale-search" className="sr-only">Search by Sale ID</label><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="sale-search" type="search" className="catalog-input pl-9" placeholder="Search by Sale ID" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0) }} /></div>
    {sales.loading && !sales.data ? <CatalogSkeleton /> : sales.data?.items.length === 0 && offset === 0 && !query ? <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-5 py-14 text-center"><Receipt aria-hidden="true" className="size-7 text-muted-foreground" /><h2 className="text-sm font-medium">No sales recorded yet.</h2><Button variant="outline" onClick={start}>Create first sale</Button></div> : sales.data ? <>
      <p role="status" className="mb-3 text-[11px] text-muted-foreground">Page {formatCount(offset / SALES_PAGE_SIZE + 1)} · {formatCount(filtered.length)} sales on this page{sales.loading ? ' · Refreshing…' : ''}</p>
      {!filtered.length ? <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{query ? 'No sales match this Sale ID.' : 'No sales on this page.'}</p> : <>
        <TableFrame label="Sales history"><table className="w-full text-left text-xs"><thead className="border-b bg-muted/30 text-[11px] text-muted-foreground"><tr>{['Sale ID', 'Date', 'Items', 'Total amount', ''].map((label, index) => <th scope="col" key={index} className="px-5 py-3 font-medium">{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((sale) => <tr key={sale.id} className="hover:bg-muted/20"><th scope="row" className="px-5 py-4 font-medium">#{sale.id}</th><td className="px-5 py-4">{saleDate(sale)}</td><td className="px-5 py-4">{sale.items.length} lines · {formatCount(sale.items.reduce((sum, item) => sum + item.quantity, 0))} units</td><td className="px-5 py-4 font-medium tabular-nums">{formatAmount(sale.total_amount)}</td><td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" aria-label={`View sale #${sale.id}`} onClick={() => setViewing(sale.id)}>View details</Button></td></tr>)}</tbody></table></TableFrame>
        <div className="space-y-3 lg:hidden">{filtered.map((sale) => <article key={sale.id} className="rounded-xl border bg-card p-4"><div className="flex justify-between gap-3"><h2 className="text-sm font-medium">Sale #{sale.id}</h2><span className="text-sm font-semibold tabular-nums">{formatAmount(sale.total_amount)}</span></div><p className="mt-2 text-[11px]">{saleDate(sale)}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{sale.items.length} lines · {formatCount(sale.items.reduce((sum, item) => sum + item.quantity, 0))} units</span><Button size="sm" variant="outline" aria-label={`View sale #${sale.id}`} onClick={() => setViewing(sale.id)}>View details</Button></div></article>)}</div>
      </>}
      <nav aria-label="Sales pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">Up to {SALES_PAGE_SIZE} sales per page</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={sales.loading || offset === 0} onClick={() => setOffset((old) => Math.max(0, old - SALES_PAGE_SIZE))}>Previous</Button><Button size="sm" variant="outline" disabled={sales.loading || !sales.data.hasNext} onClick={() => setOffset((old) => old + SALES_PAGE_SIZE)}>Next</Button></div></nav>
    </> : null}
    <p className="mt-5 text-[11px] leading-5 text-muted-foreground">Amounts have no currency symbol. Dates shown in {dashboardTimeZone}. History follows backend order.</p>
    <RecordDialog open={creating} title="New sale" description="Build a transaction using current product stock and prices." busy={busy} onClose={() => setCreating(false)}>{creating && <SaleBuilder products={products.data ?? []} loading={products.loading} loadError={products.error} refresh={products.refresh} onComplete={complete} onBusy={setBusy} onCancel={() => setCreating(false)} />}</RecordDialog>
    <RecordDialog open={viewing !== null} title={`Sale #${viewing ?? ''}`} description={`Completed transaction · dates shown in ${dashboardTimeZone}`} busy={false} onClose={() => setViewing(null)}>{viewing !== null && <SaleDetails key={viewing} id={viewing} products={products.data ?? []} />}</RecordDialog>
  </div>
}
