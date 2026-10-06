import { categoriesApi } from '@/api/categories'
import { CatalogEmpty, CatalogFeedback, CatalogHeader, CatalogLoadError, CatalogSkeleton, TableFrame } from '@/components/catalog/catalog-ui'
import { EntityForm } from '@/components/catalog/entity-form'
import { RecordActions } from '@/components/catalog/record-actions'
import { DeleteDialog, RecordDialog } from '@/components/catalog/record-dialogs'
import { useCatalog } from '@/hooks/use-catalog'
import { useRecordManagement } from '@/hooks/use-record-management'
import type { Category, CategoryInput } from '@/types/catalog'

export function CategoriesPage() {
  const categories = useCatalog(categoriesApi)
  const manager = useRecordManagement<CategoryInput, Category>('Category', categoriesApi, categories)
  const actions = (record: Category) => <RecordActions name={record.name} onEdit={() => manager.edit(record)} onDelete={() => manager.confirmDelete(record)} />
  return <div>
    <CatalogHeader title="Categories" description="Organize products into clear inventory groups." singular="category" onAdd={manager.add} onRefresh={categories.refresh} loading={categories.loading} />
    <CatalogFeedback message={manager.feedback} onDismiss={manager.dismissFeedback} />
    {categories.error && <CatalogLoadError title="Categories" stale={!!categories.data} onRetry={categories.refresh} />}
    {categories.loading && !categories.data ? <CatalogSkeleton /> : categories.data?.length === 0 ? <CatalogEmpty title="Categories" singular="category" onAdd={manager.add} /> : categories.data ? <>
      <p className="mb-3 text-[11px] text-muted-foreground" role="status">{categories.data.length} categories{categories.loading ? ' · Refreshing…' : ''}</p>
      <TableFrame label="Categories table"><table className="catalog-table"><caption className="sr-only">Inventory categories</caption><thead><tr><th scope="col">Name</th><th scope="col">Description</th><th scope="col" className="w-16">Actions</th></tr></thead><tbody>{categories.data.map((record) => <tr key={record.id}><td className="w-1/3 break-words font-medium">{record.name}</td><td className="whitespace-pre-wrap break-words text-muted-foreground">{record.description || '—'}</td><td>{actions(record)}</td></tr>)}</tbody></table></TableFrame>
      <div className="space-y-3 lg:hidden">{categories.data.map((record) => <article key={record.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-sm font-medium">{record.name}</h2>{actions(record)}</div><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{record.description || 'No description provided.'}</p></article>)}</div>
    </> : null}
    <RecordDialog open={manager.formOpen} title={manager.editing ? 'Edit category' : 'Add category'} description="Give your inventory group a clear name and description." busy={manager.busy} onClose={manager.closeForm}><EntityForm kind="category" record={manager.editing} busy={manager.busy} onSave={manager.save} onCancel={manager.closeForm} /></RecordDialog>
    <DeleteDialog open={!!manager.deleting} name={manager.deleting?.name ?? ''} singular="category" busy={manager.busy} error={manager.deleteError} onClose={manager.closeDelete} onConfirm={() => void manager.remove()} />
  </div>
}
