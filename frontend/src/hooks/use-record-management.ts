import { useRef, useState } from 'react'
import { catalogError, changedFields } from '@/lib/catalog'
import type { CatalogRecord } from '@/types/catalog'

interface MutationApi<T, Input> { create: (input: Input) => Promise<T>; update: (id: number, input: Partial<Input>) => Promise<T>; remove: (id: number) => Promise<void> }

export function useRecordManagement<Input extends object, T extends CatalogRecord & Input>(singular: string, api: MutationApi<T, Input>, list: { accept: (record: T) => void; discard: (id: number) => void }) {
  const [editing, setEditing] = useState<T | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [deleteError, setDeleteError] = useState('')
  const [feedback, setFeedback] = useState('')
  function add() { setEditing(null); setFormOpen(true) }
  function edit(record: T) { setEditing(record); setFormOpen(true) }
  function confirmDelete(record: T) { setDeleteError(''); setDeleting(record) }
  async function save(input: Input) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      const patch = editing ? changedFields(input, editing) : null
      if (patch && !Object.keys(patch).length) { setFormOpen(false); setFeedback('No changes to save.'); return }
      const record = editing ? await api.update(editing.id, patch ?? {}) : await api.create(input)
      list.accept(record); setFormOpen(false); setFeedback(`${singular} ${editing ? 'updated' : 'created'}.`)
    } finally { lock.current = false; setBusy(false) }
  }
  async function remove() {
    if (!deleting || lock.current) return
    lock.current = true; setBusy(true); setDeleteError('')
    try { await api.remove(deleting.id); list.discard(deleting.id); setDeleting(null); setFeedback(`${singular} deleted.`) }
    catch (error) { setDeleteError(catalogError(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return { editing, formOpen, deleting, busy, deleteError, feedback, add, edit, confirmDelete, save, remove, closeForm: () => setFormOpen(false), closeDelete: () => setDeleting(null), dismissFeedback: () => setFeedback('') }
}
