export interface ForecastDay { date: string; predicted_demand: number }
export interface ForecastResponse {
  product_id: number
  product_name: string
  history_days: number
  history_start: string
  history_end: string
  model: string
  forecast: ForecastDay[]
}
export interface EvaluationPeriod { start_date: string; end_date: string; days: number }
export interface ForecastMetrics {
  mae: number
  rmse: number
  mape: number | null
  mape_nonzero_days: number
  mape_zero_days_excluded: number
}
export interface EvaluationResponse {
  product_id: number
  history_days: number
  training_period: EvaluationPeriod
  testing_period: EvaluationPeriod
  model_name: string
  baseline_name: string
  evaluation_method: 'recursive_holdout'
  mape_policy: 'exclude_zero_actuals'
  model_metrics: ForecastMetrics
  baseline_metrics: ForecastMetrics
  comparison: { mae_difference: number }
}
export interface ReorderInsight {
  product_id: number
  current_stock: number
  reorder_level: number
  forecast_horizon_days: number
  forecast_start: string
  forecast_end: string
  predicted_total_demand: number
  projected_stock_after_forecast: number
  reorder_recommended: boolean
}
export type ForecastHorizon = 7 | 14 | 30
