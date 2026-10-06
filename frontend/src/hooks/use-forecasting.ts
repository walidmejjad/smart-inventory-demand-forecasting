import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/errors'
import { getEvaluation, getForecast, getReorderInsight } from '@/api/forecasting'
import type { ForecastHorizon } from '@/types/forecasting'
export type ForecastError = 'history' | 'unavailable' | 'request'
export interface ForecastResource<T> { data: T | null; loading: boolean; error: ForecastError | null; retry: () => void }
function classify(error: unknown): ForecastError {
  if (error instanceof ApiError) {
    if (error.status === 422 && error.message.startsWith('Insufficient sales history for forecasting.')) return 'history'
    if (error.status === 404) return 'unavailable'
  }
  return 'request'
}
// Request identity changes with the selected product/horizon. Old responses are
// cancelled and hidden immediately so another product's results never appear.
function useResource<T>(request: (signal: AbortSignal) => Promise<T> | null): ForecastResource<T> {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ request: typeof request | null; revision: number; data: T | null; error: ForecastError | null }>({ request: null, revision: -1, data: null, error: null })
  const loading = state.request !== request || state.revision !== revision
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await request(controller.signal)
        if (!controller.signal.aborted) setState({ request, revision, data, error: null })
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ request, revision, data: null, error: classify(error) })
      }
    }
    void load()
    return () => controller.abort()
  }, [request, revision])
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, retry: () => setRevision((old) => old + 1) }
}
export function useForecasting(id: number | null, horizon: ForecastHorizon) {
  const forecastRequest = useCallback((signal: AbortSignal) => id === null ? null : getForecast(id, horizon, signal), [id, horizon])
  const insightRequest = useCallback((signal: AbortSignal) => id === null ? null : getReorderInsight(id, horizon, signal), [id, horizon])
  const evaluationRequest = useCallback((signal: AbortSignal) => id === null ? null : getEvaluation(id, signal), [id])
  const forecast = useResource(forecastRequest)
  const insight = useResource(insightRequest)
  const evaluation = useResource(evaluationRequest)
  return { forecast, insight, evaluation, refresh: () => { forecast.retry(); insight.retry(); evaluation.retry() } }
}

