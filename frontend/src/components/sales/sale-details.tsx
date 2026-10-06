import { useEffect, useState } from 'react'
import { ApiError } from '@/api/errors'
import { salesApi } from '@/api/sales'
import { CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { Button } from '@/components/ui/button'
import { formatAmount, formatSaleDate } from '@/lib/dashboard-format'
import type { Product } from '@/types/catalog'
import type { Sale } from '@/types/sales'

export function SaleDetails({ id, products }: { id: number; products: Product[] }) {
  const [state, setState] = useState<{ sale: Sale | null; error: string }>({ sale: null, error: '' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void salesApi.get(id, controller.signal).then((sale) => { if (!controller.signal.aborted) setState({ sale, error: '' }) }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ sale: null, error: error instanceof ApiError && error.status === 404 ? 'Sale not found.' : 'Sale details couldn’t be loaded.' })
    })
    return () => controller.abort()
  }, [id, revision])
  if (state.error) return <div role="alert" className="space-y-3"><p className="text-sm">{state.error}</p><Button variant="outline" onClick={() => { setState({ sale: null, error: '' }); setRevision((old) => old + 1) }}>Retry</Button></div>
  if (!state.sale) return <CatalogSkeleton />
  const sale = state.sale
  const date = formatSaleDate(sale.created_at)
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs text-muted-foreground">{date.date} · {date.time}</p><p className="mt-2 text-xs text-muted-foreground">Operator #{sale.created_by_id}</p></div><div><p className="text-xs text-muted-foreground">Total amount</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatAmount(sale.total_amount)}</p></div></div><div className="divide-y rounded-lg border">{sale.items.map((item) => {
    const product = products.find((value) => value.id === item.product_id)
    return <div key={item.id} className="p-4"><p className="break-words text-sm font-medium">{product?.name ?? `Product #${item.product_id}`}</p>{product?.sku && <p className="mt-1 break-words text-xs text-muted-foreground">{product.sku}</p>}<div className="mt-3 flex flex-wrap justify-between gap-2 text-xs"><span className="text-muted-foreground">{item.quantity} × {formatAmount(item.unit_price)}</span><span className="font-medium tabular-nums">{formatAmount(item.subtotal)}</span></div></div>
  })}</div><p className="text-xs leading-5 text-muted-foreground">Completed sales are historical records and cannot be edited. Amounts are shown without a currency symbol.</p></div>
}
