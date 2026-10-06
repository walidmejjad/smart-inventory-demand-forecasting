import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { categoriesApi } from '@/api/categories'
import { productsApi } from '@/api/products'
import { suppliersApi } from '@/api/suppliers'
import { CatalogEmpty, CatalogFeedback, CatalogHeader, CatalogLoadError, CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { DeleteDialog, RecordDialog } from '@/components/catalog/record-dialogs'
import { ProductDetails } from '@/components/catalog/product-details'
import { ProductForm } from '@/components/catalog/product-form'
import { ProductsList } from '@/components/catalog/products-list'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/hooks/use-catalog'
import { useRecordManagement } from '@/hooks/use-record-management'
import { stockStatus } from '@/lib/catalog'
import { dashboardTimeZone, formatCount } from '@/lib/dashboard-format'
import type { Product, ProductInput } from '@/types/catalog'

export function ProductsPage() {
  const products = useCatalog(productsApi)
  const categories = useCatalog(categoriesApi)
  const suppliers = useCatalog(suppliersApi)
  const manager = useRecordManagement<ProductInput, Product>('Product', productsApi, products)
  const [viewing, setViewing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [supplier, setSupplier] = useState('')
  const [status, setStatus] = useState('')
  const refreshAll = () => { products.refresh(); categories.refresh(); suppliers.refresh() }
  const query = search.trim().toLocaleLowerCase()
  const filtered = (products.data ?? []).filter((product) => (!query || `${product.name} ${product.sku}`.toLocaleLowerCase().includes(query)) && (!category || product.category_id === Number(category)) && (!supplier || product.supplier_id === Number(supplier)) && (!status || stockStatus(product) === status))
  const clearFilters = () => { setSearch(''); setCategory(''); setSupplier(''); setStatus('') }
  return <div>
    <CatalogHeader title="Products" description="Manage your product catalog, pricing, stock levels, and reorder thresholds." singular="product" onAdd={manager.add} onRefresh={refreshAll} loading={products.loading || categories.loading || suppliers.loading} />
    <CatalogFeedback message={manager.feedback} onDismiss={manager.dismissFeedback} />
    {products.error && <CatalogLoadError title="Products" stale={!!products.data} onRetry={products.refresh} />}
    {(categories.error || suppliers.error) && <CatalogLoadError title="Category or supplier references" stale={!!(categories.data || suppliers.data)} onRetry={refreshAll} />}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)]">
      <div className="relative"><label htmlFor="product-search" className="sr-only">Search products</label><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><input id="product-search" className="catalog-input pl-9" type="search" placeholder="Search name or SKU" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div><label htmlFor="filter-category" className="sr-only">Filter by category</label><select id="filter-category" className="catalog-input" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label htmlFor="filter-supplier" className="sr-only">Filter by supplier</label><select id="filter-supplier" className="catalog-input" value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="">All suppliers</option>{(suppliers.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label htmlFor="filter-stock" className="sr-only">Filter by stock status</label><select id="filter-stock" className="catalog-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All stock statuses</option>{['In stock', 'Low stock', 'Out of stock'].map((value) => <option key={value}>{value}</option>)}</select></div>
    </div>
    {products.loading && !products.data ? <CatalogSkeleton /> : products.data?.length === 0 ? <CatalogEmpty title="Products" singular="product" onAdd={manager.add} /> : products.data ? <>
      <div className="mb-3 flex items-center justify-between gap-3"><p role="status" className="text-[11px] text-muted-foreground">{formatCount(filtered.length)} of {formatCount(products.data.length)} products{products.loading ? ' · Refreshing…' : ''}</p>{(search || category || supplier || status) && <Button variant="ghost" size="sm" onClick={clearFilters}><X aria-hidden="true" />Clear filters</Button>}</div>
      {filtered.length ? <ProductsList products={filtered} categories={categories.data ?? []} suppliers={suppliers.data ?? []} onEdit={manager.edit} onDelete={manager.confirmDelete} onView={setViewing} /> : <div className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No products match your search or filters.</div>}
    </> : null}
    <RecordDialog open={manager.formOpen} title={manager.editing ? 'Edit product' : 'Add product'} description="Keep your catalog details and stock settings up to date." busy={manager.busy} onClose={manager.closeForm}>
      {(categories.loading || suppliers.loading) && (!categories.data || !suppliers.data) ? <CatalogSkeleton /> : <ProductForm product={manager.editing} categories={categories.data ?? []} suppliers={suppliers.data ?? []} busy={manager.busy} onSave={manager.save} onCancel={manager.closeForm} />}
    </RecordDialog>
    <DeleteDialog open={!!manager.deleting} name={manager.deleting?.name ?? ''} singular="product" busy={manager.busy} error={manager.deleteError} onClose={manager.closeDelete} onConfirm={() => void manager.remove()} />
    <RecordDialog open={!!viewing} title={viewing?.name ?? 'Product details'} description={`Product details · dates shown in ${dashboardTimeZone}`} busy={false} onClose={() => setViewing(null)}>{viewing && <ProductDetails id={viewing.id} categories={categories.data ?? []} suppliers={suppliers.data ?? []} />}</RecordDialog>
    <p className="mt-5 text-[11px] text-muted-foreground">Prices are shown without a currency symbol.</p>
  </div>
}
