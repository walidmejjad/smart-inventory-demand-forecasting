import { useEffect, useState } from 'react'
import { getDashboardSummary, getInventorySummary, getRecentSales, getSalesSummary, getTopProducts } from '@/api/dashboard'
import type { DashboardSummary, InventorySummary, RecentSale, SalesSummary, TopProduct } from '@/types/dashboard'

export interface DashboardResource<T> {
  data: T | null
  error: boolean
}

interface DashboardState {
  summary: DashboardResource<DashboardSummary>
  inventory: DashboardResource<InventorySummary>
  sales: DashboardResource<SalesSummary>
  recentSales: DashboardResource<RecentSale[]>
  topProducts: DashboardResource<TopProduct[]>
  isLoading: boolean
  checkedAt: Date | null
}

function emptyResource<T>(): DashboardResource<T> { return { data: null, error: false } }

function settle<T>(previous: DashboardResource<T>, result: PromiseSettledResult<T>): DashboardResource<T> {
  // Preserve a previously loaded section on refresh failure, with an explicit stale-data notice.
  return result.status === 'fulfilled' ? { data: result.value, error: false } : { ...previous, error: true }
}

export function useDashboard() {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<DashboardState>(() => ({
    summary: emptyResource(), inventory: emptyResource(), sales: emptyResource(),
    recentSales: emptyResource(), topProducts: emptyResource(), isLoading: true, checkedAt: null,
  }))

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const results = await Promise.allSettled([
        getDashboardSummary(controller.signal), getInventorySummary(controller.signal),
        getSalesSummary(controller.signal), getRecentSales(controller.signal), getTopProducts(controller.signal),
      ])
      if (controller.signal.aborted) return
      setState((previous) => ({
        summary: settle(previous.summary, results[0]), inventory: settle(previous.inventory, results[1]),
        sales: settle(previous.sales, results[2]), recentSales: settle(previous.recentSales, results[3]),
        topProducts: settle(previous.topProducts, results[4]), isLoading: false, checkedAt: new Date(),
      }))
    }
    void load()
    return () => controller.abort()
  }, [revision])

  function refresh() {
    if (state.isLoading) return
    setState((previous) => ({ ...previous, isLoading: true }))
    setRevision((value) => value + 1)
  }

  return { ...state, refresh }
}
