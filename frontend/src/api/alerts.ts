import { apiClient } from '@/api/client'
import type { AlertSummary, StockAlert } from '@/types/alert'

export async function getAlertSummary(signal: AbortSignal) {
  return (await apiClient.get<AlertSummary>('/api/alerts/summary', { signal })).data
}
export async function getStockAlerts(signal: AbortSignal) {
  return (await apiClient.get<StockAlert[]>('/api/alerts/low-stock', { signal })).data
}
