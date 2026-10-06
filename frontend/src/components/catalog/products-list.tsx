import { RecordActions } from '@/components/catalog/record-actions'
import { TableFrame } from '@/components/catalog/catalog-ui'
import { stockStatus, type StockStatus } from '@/lib/catalog'
import { formatAmount, formatCount } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import type { Category, Product, Supplier } from '@/types/catalog'

export function StockBadge({ status }: { status: StockStatus }) {
  return <span className={cn('inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium', status === 'Out of stock' ? 'border-destructive/20 bg-destructive/5 text-destructive' : status === 'Low stock' ? 'border-chart-3/25 bg-chart-3/10 text-foreground' : 'border-border bg-muted/60 text-muted-foreground')}>{status}</span>
}

export function ProductsList({ products, categories, suppliers, onEdit, onDelete, onView }: { products: Product[]; categories: Category[]; suppliers: Supplier[]; onEdit: (product: Product) => void; onDelete: (product: Product) => void; onView: (product: Product) => void }) {
  const categoryName = (id: number) => categories.find((item) => item.id === id)?.name ?? `Category #${id}`
  const supplierName = (id: number) => suppliers.find((item) => item.id === id)?.name ?? `Supplier #${id}`
  const actions = (product: Product) => <RecordActions name={product.name} onEdit={() => onEdit(product)} onDelete={() => onDelete(product)} onView={() => onView(product)} />
  return <>
    <TableFrame label="Products table"><table className="catalog-table min-w-[960px]"><caption className="sr-only">Product catalog with pricing, stock and reorder levels</caption><thead><tr>{['Product', 'SKU', 'Category', 'Supplier', 'Price', 'Stock', 'Reorder', 'Status', 'Actions'].map((title) => <th key={title} scope="col">{title}</th>)}</tr></thead><tbody>{products.map((product) => <tr key={product.id}>
      <td className="max-w-60"><button className="text-left text-xs font-medium hover:underline" onClick={() => onView(product)}>{product.name}</button>{product.description && <p className="mt-1.5 line-clamp-1 max-w-56 text-[11px] text-muted-foreground">{product.description}</p>}</td>
      <td className="max-w-40 break-words text-[11px] text-muted-foreground">{product.sku}</td><td className="max-w-40 break-words text-muted-foreground">{categoryName(product.category_id)}</td><td className="max-w-40 break-words text-muted-foreground">{supplierName(product.supplier_id)}</td>
      <td className="whitespace-nowrap tabular-nums">{formatAmount(product.price)}</td><td className="tabular-nums">{formatCount(product.quantity_in_stock)}</td><td className="text-muted-foreground tabular-nums">{formatCount(product.reorder_level)}</td><td><StockBadge status={stockStatus(product)} /></td><td>{actions(product)}</td>
    </tr>)}</tbody></table></TableFrame>
    <div className="space-y-3 lg:hidden">{products.map((product) => <article key={product.id} className="rounded-xl border bg-card p-4 shadow-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><button className="break-words text-left text-sm font-medium hover:underline" onClick={() => onView(product)}>{product.name}</button><p className="mt-1.5 break-all text-[11px] text-muted-foreground">{product.sku}</p></div>{actions(product)}</div><div className="mt-4"><StockBadge status={stockStatus(product)} /></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">{[['Price', formatAmount(product.price)], ['Stock / reorder', `${formatCount(product.quantity_in_stock)} / ${formatCount(product.reorder_level)}`], ['Category', categoryName(product.category_id)], ['Supplier', supplierName(product.supplier_id)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl></article>)}</div>
  </>
}
