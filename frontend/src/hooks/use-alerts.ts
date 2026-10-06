import { useEffect, useState } from 'react'
import { getAlertSummary, getStockAlerts } from '@/api/alerts'
import type { AlertSummary, StockAlert } from '@/types/alert'

interface Resource<T> { data: T | null; error: boolean }
function settle<T>(old: Resource<T>, result: PromiseSettledResult<T>): Resource<T> {
  return result.status === 'fulfilled' ? { data: result.value, error: false } : { ...old, error: true }
}

export function useAlerts() {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ revision: number; summary: Resource<AlertSummary>; alerts: Resource<StockAlert[]> }>({ revision: -1, summary: { data: null, error: false }, alerts: { data: null, error: false } })
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const results = await Promise.allSettled([getAlertSummary(controller.signal), getStockAlerts(controller.signal)])
      if (!controller.signal.aborted) setState((old) => ({ revision, summary: settle(old.summary, results[0]), alerts: settle(old.alerts, results[1]) }))
    }
    void load()
    return () => controller.abort()
  }, [revision])
  return { ...state, loading: state.revision !== revision, refresh: () => setRevision((old) => old + 1) }
}
