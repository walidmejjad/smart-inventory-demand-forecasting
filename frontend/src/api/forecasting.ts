import { apiClient } from '@/api/client'
import type { EvaluationResponse, ForecastHorizon, ForecastResponse, ReorderInsight } from '@/types/forecasting'
export async function getForecast(id: number, horizon: ForecastHorizon, signal: AbortSignal) {
  return (await apiClient.get<ForecastResponse>(`/api/forecasting/products/${id}`, { params: { horizon_days: horizon }, signal })).data
}
export async function getEvaluation(id: number, signal: AbortSignal) {
  return (await apiClient.get<EvaluationResponse>(`/api/forecasting/products/${id}/evaluation`, { signal })).data
}
export async function getReorderInsight(id: number, horizon: ForecastHorizon, signal: AbortSignal) {
  return (await apiClient.get<ReorderInsight>(`/api/forecasting/products/${id}/reorder-insight`, { params: { horizon_days: horizon }, signal })).data
}
