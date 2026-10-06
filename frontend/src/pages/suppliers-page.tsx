import { suppliersApi } from '@/api/suppliers'
import { CatalogEmpty, CatalogFeedback, CatalogHeader, CatalogLoadError, CatalogSkeleton, TableFrame } from '@/components/catalog/catalog-ui'
import { EntityForm } from '@/components/catalog/entity-form'
import { RecordActions } from '@/components/catalog/record-actions'
import { DeleteDialog, RecordDialog } from '@/components/catalog/record-dialogs'
import { useCatalog } from '@/hooks/use-catalog'
import { useRecordManagement } from '@/hooks/use-record-management'
import type { Supplier, SupplierInput } from '@/types/catalog'

export function SuppliersPage() {
  const suppliers = useCatalog(suppliersApi)
  const manager = useRecordManagement<SupplierInput, Supplier>('Supplier', suppliersApi, suppliers)
  const actions = (record: Supplier) => <RecordActions name={record.name} onEdit={() => manager.edit(record)} onDelete={() => manager.confirmDelete(record)} />
  return <div>
    <CatalogHeader title="Suppliers" description="Manage supplier contacts and sourcing information." singular="supplier" onAdd={manager.add} onRefresh={suppliers.refresh} loading={suppliers.loading} />
    <CatalogFeedback message={manager.feedback} onDismiss={manager.dismissFeedback} />
    {suppliers.error && <CatalogLoadError title="Suppliers" stale={!!suppliers.data} onRetry={suppliers.refresh} />}
    {suppliers.loading && !suppliers.data ? <CatalogSkeleton /> : suppliers.data?.length === 0 ? <CatalogEmpty title="Suppliers" singular="supplier" onAdd={manager.add} /> : suppliers.data ? <>
      <p className="mb-3 text-[11px] text-muted-foreground" role="status">{suppliers.data.length} suppliers{suppliers.loading ? ' · Refreshing…' : ''}</p>
      <TableFrame label="Suppliers table"><table className="catalog-table min-w-[650px]"><caption className="sr-only">Supplier contacts</caption><thead><tr>{['Supplier', 'Email', 'Phone', 'Address', 'Actions'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{suppliers.data.map((record) => <tr key={record.id}><td className="max-w-52 break-words font-medium">{record.name}</td><td className="max-w-56 break-all text-muted-foreground">{record.email || '—'}</td><td className="max-w-40 break-words text-muted-foreground">{record.phone || '—'}</td><td className="max-w-64 whitespace-pre-wrap break-words text-muted-foreground">{record.address || '—'}</td><td>{actions(record)}</td></tr>)}</tbody></table></TableFrame>
      <div className="space-y-3 lg:hidden">{suppliers.data.map((record) => <article key={record.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-sm font-medium">{record.name}</h2>{actions(record)}</div><dl className="mt-4 space-y-3 text-xs">{[['Email', record.email], ['Phone', record.phone], ['Address', record.address]].map(([label, value]) => <div key={label}><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || '—'}</dd></div>)}</dl></article>)}</div>
    </> : null}
    <RecordDialog open={manager.formOpen} title={manager.editing ? 'Edit supplier' : 'Add supplier'} description="Keep supplier contact and sourcing information in one place." busy={manager.busy} onClose={manager.closeForm}><EntityForm kind="supplier" record={manager.editing} busy={manager.busy} onSave={manager.save} onCancel={manager.closeForm} /></RecordDialog>
    <DeleteDialog open={!!manager.deleting} name={manager.deleting?.name ?? ''} singular="supplier" busy={manager.busy} error={manager.deleteError} onClose={manager.closeDelete} onConfirm={() => void manager.remove()} />
  </div>
}
