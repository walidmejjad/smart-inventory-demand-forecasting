import { useState, type FormEvent } from 'react'
import { ClipboardList, RefreshCw, Search, X } from 'lucide-react'
import { MOVEMENTS_PAGE_SIZE } from '@/api/inventory-movements'
import { productsApi } from '@/api/products'
import { CatalogLoadError, CatalogSkeleton, Field } from '@/components/catalog/catalog-ui'
import { RecordDialog } from '@/components/catalog/record-dialogs'
import { MovementDetails } from '@/components/inventory-movements/movement-details'
import { MovementsList } from '@/components/inventory-movements/movements-list'
import { SaleDetails } from '@/components/sales/sale-details'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/hooks/use-catalog'
import { useInventoryMovements } from '@/hooks/use-inventory-movements'
import { dashboardTimeZone, formatCount } from '@/lib/dashboard-format'
import { movementTypeLabel, positiveId, supportedMovementTypes } from '@/lib/inventory-movements'
import type { MovementQuery } from '@/types/inventory-movement'

export function InventoryMovementsPage() {
  const [query, setQuery] = useState<MovementQuery>({ offset: 0 })
  const movements = useInventoryMovements(query)
  const products = useCatalog(productsApi)
  const [draft, setDraft] = useState({ product: '', type: '', sale: '' })
  const [saleError, setSaleError] = useState('')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)
  const [saleId, setSaleId] = useState<number | null>(null)
  const records = movements.data?.items ?? []
  const productRecords = products.data ?? []
  const productOptions = new Map(productRecords.map((product) => [product.id, `${product.name} · ${product.sku}`]))
  for (const movement of records) if (!productOptions.has(movement.product_id)) productOptions.set(movement.product_id, `Product #${movement.product_id}`)
  const text = search.trim().toLocaleLowerCase()
  const filtered = records.filter((movement) => {
    const product = productRecords.find((item) => item.id === movement.product_id)
    return !text || `${product?.name ?? `Product #${movement.product_id}`} ${product?.sku ?? ''}`.toLocaleLowerCase().includes(text)
  })
  const hasFilters = !!(query.product_id || query.movement_type || query.sale_id)
  const hasDraft = !!(draft.product || draft.type || draft.sale || search)
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sale = draft.sale.trim().replace(/^#/, '')
    if (sale && !positiveId(sale)) { setSaleError('Enter a positive whole Sale ID.'); document.getElementById('movement-sale-filter')?.focus(); return }
    setSaleError('')
    setQuery({ offset: 0, product_id: draft.product ? Number(draft.product) : undefined, movement_type: supportedMovementTypes.find((value) => value === draft.type), sale_id: sale ? Number(sale) : undefined })
  }
  function clear() { setDraft({ product: '', type: '', sale: '' }); setSearch(''); setSaleError(''); setQuery({ offset: 0 }) }
  function refresh() { movements.refresh(); products.refresh() }
  return <div>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Inventory audit</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Inventory Movements</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Review stock changes and the transactions that caused them.</p></div><Button data-catalog-primary-action variant="outline" size="icon" aria-label="Refresh inventory movements" disabled={movements.loading || products.loading} onClick={refresh}><RefreshCw aria-hidden="true" /></Button></div>
    <form onSubmit={apply} className="mb-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.3fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]">
      <Field name="movement-product-filter" label="Product"><select id="movement-product-filter" className="catalog-input" value={draft.product} onChange={(event) => setDraft((old) => ({ ...old, product: event.target.value }))}><option value="">All products</option>{[...productOptions].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
      <Field name="movement-type-filter" label="Movement type"><select id="movement-type-filter" className="catalog-input" value={draft.type} onChange={(event) => setDraft((old) => ({ ...old, type: event.target.value }))}><option value="">All types</option>{supportedMovementTypes.map((type) => <option key={type} value={type}>{movementTypeLabel(type)}</option>)}</select></Field>
      <Field name="movement-sale-filter" label="Related Sale ID" error={saleError}><input id="movement-sale-filter" type="text" inputMode="numeric" className="catalog-input" placeholder="Enter Sale ID" value={draft.sale} onChange={(event) => { setDraft((old) => ({ ...old, sale: event.target.value })); setSaleError('') }} aria-invalid={!!saleError} aria-describedby={saleError ? 'movement-sale-filter-error' : undefined} /></Field>
      <Button type="submit" variant="outline">Apply filters</Button>
    </form>
    <div className="mb-5 flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1 sm:max-w-sm"><label htmlFor="movement-search" className="sr-only">Search this page by product name or SKU</label><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="movement-search" type="search" className="catalog-input pl-9" placeholder="Search products on this page" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{(hasDraft || hasFilters) && <Button variant="ghost" size="sm" onClick={clear}><X aria-hidden="true" />Clear filters</Button>}</div>
    {products.error && <CatalogLoadError title="Product references" stale={!!products.data} onRetry={products.refresh} />}
    {movements.error && <CatalogLoadError title="Inventory movements" stale={!!movements.data} onRetry={movements.refresh} />}
    {movements.loading && !movements.data ? <CatalogSkeleton /> : movements.data ? <>
      <p role="status" className="mb-3 text-[11px] leading-5 text-muted-foreground">Page {formatCount(query.offset / MOVEMENTS_PAGE_SIZE + 1)} · {formatCount(filtered.length)} of {formatCount(records.length)} records on this page · Newest first{movements.loading ? ' · Refreshing…' : ''}</p>
      {filtered.length ? <MovementsList movements={filtered} products={productRecords} onView={setViewing} onSale={setSaleId} /> : <div className="rounded-xl border bg-card px-5 py-12 text-center"><ClipboardList aria-hidden="true" className="mx-auto mb-4 size-7 text-muted-foreground" /><h2 className="text-sm font-medium">{text ? 'No products match your search on this page.' : hasFilters ? 'No movements match these filters.' : query.offset > 0 ? 'No movements on this page.' : 'No inventory movements yet.'}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{text ? 'Search applies to the current page. Use the Product filter to search across history.' : hasFilters ? 'Try a different product, movement type, or Sale ID.' : 'Stock changes will appear here as inventory activity occurs.'}</p></div>}
      <nav aria-label="Inventory movement pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-muted-foreground">Up to {MOVEMENTS_PAGE_SIZE} movements per page</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={movements.loading || query.offset === 0} onClick={() => setQuery((old) => ({ ...old, offset: Math.max(0, old.offset - MOVEMENTS_PAGE_SIZE) }))}>Previous</Button><Button size="sm" variant="outline" disabled={movements.loading || !movements.data.hasNext} onClick={() => setQuery((old) => ({ ...old, offset: old.offset + MOVEMENTS_PAGE_SIZE }))}>Next</Button></div></nav>
    </> : null}
    <p className="mt-5 text-[11px] leading-5 text-muted-foreground">Read-only audit trail. Dates shown in {dashboardTimeZone}. Product names and SKUs reflect the current catalog.</p>
    <RecordDialog open={viewing !== null} title={`Movement #${viewing ?? ''}`} description={`Stock change details · dates shown in ${dashboardTimeZone}`} busy={false} onClose={() => setViewing(null)}>{viewing !== null && <MovementDetails key={viewing} id={viewing} products={productRecords} onSale={setSaleId} />}</RecordDialog>
    <RecordDialog open={saleId !== null} title={`Sale #${saleId ?? ''}`} description={`Completed transaction · dates shown in ${dashboardTimeZone}`} busy={false} onClose={() => setSaleId(null)}>{saleId !== null && <SaleDetails key={saleId} id={saleId} products={productRecords} />}</RecordDialog>
  </div>
}
