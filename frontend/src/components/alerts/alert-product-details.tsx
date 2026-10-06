import { categoriesApi } from '@/api/categories'
import { suppliersApi } from '@/api/suppliers'
import { CatalogLoadError } from '@/components/catalog/catalog-ui'
import { ProductDetails } from '@/components/catalog/product-details'
import { useCatalog } from '@/hooks/use-catalog'

export function AlertProductDetails({ id }: { id: number }) {
  const categories = useCatalog(categoriesApi)
  const suppliers = useCatalog(suppliersApi)
  return <>{(categories.error || suppliers.error) && <CatalogLoadError title="Category or supplier references" stale={!!(categories.data || suppliers.data)} onRetry={() => { categories.refresh(); suppliers.refresh() }} />}<ProductDetails id={id} categories={categories.data ?? []} suppliers={suppliers.data ?? []} /></>
}
