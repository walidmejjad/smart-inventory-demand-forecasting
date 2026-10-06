import { useState } from 'react'
import { RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import { AlertProductDetails } from '@/components/alerts/alert-product-details'
import { AlertSummary } from '@/components/alerts/alert-summary'
import { AlertsList } from '@/components/alerts/alerts-list'
import { alertPriority, alertStatusLabel } from '@/lib/alerts'
import { CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { RecordDialog } from '@/components/catalog/record-dialogs'
import { Button } from '@/components/ui/button'
import { useAlerts } from '@/hooks/use-alerts'
import { formatCount } from '@/lib/dashboard-format'
import type { StockAlert } from '@/types/alert'

export function AlertsPage() {
  const data = useAlerts()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [viewing, setViewing] = useState<StockAlert | null>(null)
  const records = data.alerts.data ?? []
  const statuses = [...new Set(['OUT_OF_STOCK', 'LOW_STOCK', ...records.map((alert) => alert.status)])]
  const text = search.trim().toLocaleLowerCase()
  const filtered = records.filter((alert) => (!text || `${alert.name} ${alert.sku}`.toLocaleLowerCase().includes(text)) && (!status || alert.status === status)).sort((a, b) => alertPriority(a.status) - alertPriority(b.status) || a.product_id - b.product_id)
  function error(message: string, stale: boolean) { return <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"><p className="text-xs leading-5">{message}{stale && ' Showing previously loaded data.'}</p><Button size="sm" variant="outline" onClick={data.refresh}>Retry</Button></div> }
  return <div>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Inventory attention</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Alerts</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Monitor products that need inventory attention.</p></div><Button data-catalog-primary-action size="icon" variant="outline" aria-label="Refresh alerts" disabled={data.loading} onClick={data.refresh}><RefreshCw aria-hidden="true" /></Button></div>
    {data.summary.error && error('Alert summary couldn’t be loaded.', !!data.summary.data)}
    <AlertSummary data={data.summary.data} loading={data.loading} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(150px,0.5fr)_auto]"><div className="relative min-w-0"><label htmlFor="alert-search" className="sr-only">Search alerts by product name or SKU</label><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="alert-search" type="search" className="catalog-input pl-9" placeholder="Search name or SKU" value={search} onChange={(event) => setSearch(event.currentTarget.value)} /></div><div><label htmlFor="alert-status-filter" className="sr-only">Filter alert status</label><select id="alert-status-filter" className="catalog-input" value={status} onChange={(event) => setStatus(event.currentTarget.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{alertStatusLabel(value)}</option>)}</select></div>{(search || status) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus('') }}><X aria-hidden="true" />Clear filters</Button>}</div>
    {data.alerts.error && error('Alerts couldn’t be loaded.', !!data.alerts.data)}
    {data.loading && !data.alerts.data ? <CatalogSkeleton /> : data.alerts.data ? records.length === 0 ? <div className="rounded-xl border bg-card px-5 py-12 text-center"><ShieldCheck aria-hidden="true" className="mx-auto mb-4 size-7 text-muted-foreground" /><h2 className="text-sm font-medium">All inventory levels look healthy.</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">No products currently require stock attention.</p></div> : <><p role="status" className="mb-3 text-[11px] leading-5 text-muted-foreground">{formatCount(filtered.length)} of {formatCount(records.length)} alerts · Out of stock first{data.loading ? ' · Refreshing…' : ''}</p>{filtered.length ? <AlertsList alerts={filtered} onView={setViewing} /> : <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No alerts match your search or status filter.</div>}</> : null}
    <p className="mt-5 text-[11px] leading-5 text-muted-foreground">Alerts reflect current inventory. Stock changes are managed through existing inventory workflows.</p>
    <RecordDialog open={viewing !== null} title={viewing?.name ?? 'Product details'} description="Current product details · read-only inspection" busy={false} onClose={() => setViewing(null)}>{viewing && <AlertProductDetails key={viewing.product_id} id={viewing.product_id} />}</RecordDialog>
  </div>
}

