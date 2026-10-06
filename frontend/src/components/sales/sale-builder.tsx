import { useRef, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { salesApi } from '@/api/sales'
import { CatalogLoadError, CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { Button } from '@/components/ui/button'
import { stockStatus } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/dashboard-format'
import { centsAmount, lineCents, saleError, validQuantity } from '@/lib/sales'
import type { Product } from '@/types/catalog'
import type { Sale } from '@/types/sales'

export function SaleBuilder({ products, loading, loadError, refresh, onComplete, onBusy, onCancel }: { products: Product[]; loading: boolean; loadError: boolean; refresh: () => void; onComplete: (sale: Sale) => void; onBusy: (busy: boolean) => void; onCancel: () => void }) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ id: number; quantity: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const query = search.trim().toLocaleLowerCase()
  const candidates = products.filter((product) => `${product.name} ${product.sku}`.toLocaleLowerCase().includes(query))
  const lines = cart.map((line) => ({ ...line, product: products.find((product) => product.id === line.id) }))
  const valid = lines.length > 0 && lines.every((line) => line.product && validQuantity(line.quantity, line.product.quantity_in_stock))
  const total = lines.reduce((sum, line) => sum + (line.product && validQuantity(line.quantity, line.product.quantity_in_stock) ? lineCents(line.product.price, Number(line.quantity)) : 0n), 0n)
  async function submit() {
    if (!valid || loading || loadError || submitting.current) return
    submitting.current = true; setBusy(true); onBusy(true); setError('')
    try {
      const sale = await salesApi.create({ items: cart.map((line) => ({ product_id: line.id, quantity: Number(line.quantity) })) })
      onComplete(sale)
    } catch (failure) { setError(saleError(failure, products)); refresh() }
    finally { submitting.current = false; setBusy(false); onBusy(false) }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="space-y-6">
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-xs leading-5 text-destructive">{error}</p>}
    <section aria-labelledby="picker-title"><h2 id="picker-title" className="mb-3 text-sm font-semibold">Choose products</h2>
      <div className="relative mb-3"><label htmlFor="sale-product-search" className="sr-only">Search products by name or SKU</label><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="sale-product-search" type="search" className="catalog-input pl-9" placeholder="Search name or SKU" value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} /></div>
      {loadError && <CatalogLoadError title="Products" stale={products.length > 0} onRetry={refresh} />}
      {loading ? <CatalogSkeleton /> : <div className="max-h-56 overflow-y-auto rounded-lg border divide-y" aria-label="Available products">{candidates.map((product) => {
        const selected = cart.some((line) => line.id === product.id)
        return <div key={product.id} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="break-words text-xs font-medium">{product.name}</p><p className="mt-1 break-words text-[11px] text-muted-foreground">{product.sku} · {formatAmount(product.price)}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatCount(product.quantity_in_stock)} available · {stockStatus(product)}</p></div><Button type="button" size="icon" variant="outline" aria-label={`Add ${product.name}`} disabled={busy || loadError || product.quantity_in_stock < 1 || selected} onClick={() => setCart((old) => [...old, { id: product.id, quantity: '1' }])}><Plus aria-hidden="true" /></Button>{selected && <span className="sr-only">Added</span>}</div>
      })}{!candidates.length && <p className="p-5 text-center text-xs text-muted-foreground">{products.length ? 'No products match your search.' : 'No products available.'}</p>}</div>}
    </section>
    <section aria-labelledby="cart-title"><div className="mb-3 flex justify-between gap-3"><h2 id="cart-title" className="text-sm font-semibold">Sale items</h2><span className="text-xs text-muted-foreground">{cart.length} lines</span></div>
      {!cart.length ? <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Choose a product to start this sale.</p> : <div className="divide-y rounded-lg border">{lines.map((line) => {
        const product = line.product
        const quantityValid = !!product && validQuantity(line.quantity, product.quantity_in_stock)
        return <div key={line.id} className="space-y-3 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xs font-medium">{product?.name ?? `Product #${line.id}`}</p><p className="mt-1 break-words text-[11px] text-muted-foreground">{product?.sku ?? 'Product unavailable'}{product && ` · ${formatAmount(product.price)} per unit`}</p></div><Button type="button" size="icon" variant="ghost" disabled={busy} aria-label={`Remove ${product?.name ?? `Product #${line.id}`}`} onClick={() => setCart((old) => old.filter((item) => item.id !== line.id))}><Trash2 aria-hidden="true" /></Button></div>
          <div className="flex items-end justify-between gap-3"><div><label htmlFor={`quantity-${line.id}`} className="mb-1 block text-[11px] text-muted-foreground">Quantity · {product?.quantity_in_stock ?? 0} available</label><input id={`quantity-${line.id}`} aria-label={`Quantity for ${product?.name ?? `Product #${line.id}`}`} aria-invalid={!quantityValid} aria-describedby={!quantityValid ? `quantity-error-${line.id}` : undefined} className="catalog-input w-24" type="number" inputMode="numeric" min={1} max={Math.min(product?.quantity_in_stock ?? 0, 2147483647)} step={1} value={line.quantity} disabled={busy} onChange={(event) => setCart((old) => old.map((item) => item.id === line.id ? { ...item, quantity: event.target.value } : item))} /></div><p className="text-sm font-semibold tabular-nums">{quantityValid && product ? formatAmount(centsAmount(lineCents(product.price, Number(line.quantity)))) : '—'}</p></div>
          {!quantityValid && <p id={`quantity-error-${line.id}`} className="text-xs text-destructive">{product && product.quantity_in_stock > 0 ? `Enter a whole quantity from 1 to ${Math.min(product.quantity_in_stock, 2147483647)}.` : 'This product is unavailable. Remove it to continue.'}</p>}
        </div>
      })}</div>}
    </section>
    <div className="rounded-lg bg-muted/50 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Preview total</span><output aria-live="polite" className="text-xl font-semibold tabular-nums">{valid || !cart.length ? formatAmount(centsAmount(total)) : '—'}</output></div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Amounts have no currency symbol. Final prices and stock are checked when the sale is completed.</p></div>
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={!valid || busy || loading || loadError}>{busy ? 'Completing sale…' : 'Complete sale'}</Button></div>
  </form>
}
