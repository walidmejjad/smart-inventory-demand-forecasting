import { useEffect, useState } from 'react'
import { salesApi, type SaleHistoryPage } from '@/api/sales'
export function useSalesHistory(offset: number, search: string) {
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([offset, search])
  const [state, setState] = useState<{ key: string; revision: number; data: SaleHistoryPage | null; error: boolean }>({ key: '', revision: -1, data: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    void salesApi.history(offset, search, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ key, revision, data, error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setState((old) => ({ key, revision, data: old.key === key ? old.data : null, error: true }))
    })
    return () => controller.abort()
  }, [offset, search, key, revision])
  const loading = state.key !== key || state.revision !== revision
  return { data: state.key === key ? state.data : null, loading, error: !loading && state.error, refresh: () => setRevision((old) => old + 1) }
}
