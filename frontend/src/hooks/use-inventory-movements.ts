import { useEffect, useState } from 'react'
import { inventoryMovementsApi } from '@/api/inventory-movements'
import type { MovementPage, MovementQuery } from '@/types/inventory-movement'

export function useInventoryMovements({ offset, product_id, movement_type, sale_id }: MovementQuery) {
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([offset, product_id, movement_type, sale_id])
  const [state, setState] = useState<{ key: string; revision: number; data: MovementPage | null; error: boolean }>({ key: '', revision: -1, data: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    void inventoryMovementsApi.list({ offset, product_id, movement_type, sale_id }, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ key, revision, data, error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setState((old) => ({ key, revision, data: old.key === key ? old.data : null, error: true }))
    })
    return () => controller.abort()
  }, [offset, product_id, movement_type, sale_id, key, revision])
  const loading = state.key !== key || state.revision !== revision
  return { data: state.key === key ? state.data : null, loading, error: !loading && state.error, refresh: () => setRevision((old) => old + 1) }
}
