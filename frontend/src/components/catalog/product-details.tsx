import { useEffect, useState } from 'react'
import { productsApi } from '@/api/products'
import { Button } from '@/components/ui/button'
import { CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { formatAmount, formatCount, formatSaleDate } from '@/lib/dashboard-format'
import { stockStatus } from '@/lib/catalog'
import type { Category, Product, Supplier } from '@/types/catalog'

export function ProductDetails({ id, categories, suppliers }: { id: number; categories: Category[]; suppliers: Supplier[] }) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ product: Product | null; error: boolean }>({ product: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    productsApi.get(id, controller.signal).then((product) => { if (!controller.signal.aborted) setState({ product, error: false }) }).catch(() => { if (!controller.signal.aborted) setState({ product: null, error: true }) })
    return () => controller.abort()
  }, [id, revision])
  if (state.error) return <div role="alert" className="space-y-3 text-sm"><p>Product details couldn’t be loaded.</p><Button variant="outline" size="sm" onClick={() => { setState({ product: null, error: false }); setRevision((old) => old + 1) }}>Retry</Button></div>
  if (!state.product) return <CatalogSkeleton />
  const product = state.product
  const fields = [
    ['SKU', product.sku], ['Price', formatAmount(product.price)], ['Stock', `${formatCount(product.quantity_in_stock)} · ${stockStatus(product)}`], ['Reorder level', formatCount(product.reorder_level)],
    ['Category', categories.find((item) => item.id === product.category_id)?.name ?? `Category #${product.category_id}`], ['Supplier', suppliers.find((item) => item.id === product.supplier_id)?.name ?? `Supplier #${product.supplier_id}`],
    ['Created', `${formatSaleDate(product.created_at).date} ${formatSaleDate(product.created_at).time}`], ['Updated', `${formatSaleDate(product.updated_at).date} ${formatSaleDate(product.updated_at).time}`],
  ]
  return <div><p className="mb-6 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{product.description || 'No description provided.'}</p><dl className="grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium">{value}</dd></div>)}</dl></div>
}
