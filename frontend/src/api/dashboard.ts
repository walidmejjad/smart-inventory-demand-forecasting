import { apiClient } from '@/api/client'
import type { DashboardSummary, InventorySummary, RecentSale, SalesSummary, TopProduct } from '@/types/dashboard'

export async function getDashboardSummary(signal: AbortSignal) {
  return (await apiClient.get<DashboardSummary>('/api/dashboard/summary', { signal })).data
}

export async function getRecentSales(signal: AbortSignal) {
  return (await apiClient.get<RecentSale[]>('/api/dashboard/recent-sales', { params: { limit: 5 }, signal })).data
}

export async function getTopProducts(signal: AbortSignal) {
  return (await apiClient.get<TopProduct[]>('/api/dashboard/top-products', { params: { limit: 5 }, signal })).data
}

export async function getSalesSummary(signal: AbortSignal) {
  return (await apiClient.get<SalesSummary>('/api/dashboard/sales-summary', { signal })).data
}

export async function getInventorySummary(signal: AbortSignal) {
  return (await apiClient.get<InventorySummary>('/api/dashboard/inventory-summary', { signal })).data
}
