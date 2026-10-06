import { ForecastFailure, ForecastPanel, ForecastSkeleton } from '@/components/forecasting/forecast-ui'
import type { ForecastResource } from '@/hooks/use-forecasting'
import { formatForecastDate, formatForecastNumber, modelLabel } from '@/lib/forecasting-format'
import type { EvaluationResponse } from '@/types/forecasting'
function metricValue(value: number | null, percent: boolean) { return value === null ? 'Not available' : formatForecastNumber(value) + (percent ? '%' : '') }
export function ForecastEvaluation({ resource }: { resource: ForecastResource<EvaluationResponse> }) {
  const data = resource.data
  const metrics = [
    { key: 'mae' as const, label: 'MAE', description: 'Average absolute prediction error, in units.' },
    { key: 'rmse' as const, label: 'RMSE', description: 'Prediction error in units; gives larger errors more weight.' },
    { key: 'mape' as const, label: 'MAPE', description: 'Average percentage error on days with nonzero actual demand.' },
  ]
  return <ForecastPanel title="Model evaluation" description="Chronological recursive holdout · model and baseline tested on the same period">
    {resource.loading ? <ForecastSkeleton label="Loading model evaluation" /> : resource.error ? <ForecastFailure secondary error={resource.error} message="Model evaluation couldn’t be loaded." onRetry={resource.retry} /> : data ? <>
      <div className="grid gap-4 sm:grid-cols-3">{metrics.map((metric) => <div key={metric.key} className="min-w-0"><h3 className="text-xs font-medium">{metric.label}</h3><p className="mt-2 text-xl font-semibold tabular-nums" data-evaluation-metric={metric.key}>{metricValue(data.model_metrics[metric.key], metric.key === 'mape')}</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{metric.description}</p><p className="mt-3 text-[11px] text-muted-foreground">Baseline: {metricValue(data.baseline_metrics[metric.key], metric.key === 'mape')}</p></div>)}</div>
      <div className="mt-5 space-y-2 border-t pt-4 text-[11px] leading-5 text-muted-foreground"><p>Model: {modelLabel(data.model_name)} · Baseline: {data.baseline_name}</p><p>Training: {formatForecastDate(data.training_period.start_date)} – {formatForecastDate(data.training_period.end_date)} ({data.training_period.days} days)</p><p>Testing: {formatForecastDate(data.testing_period.start_date)} – {formatForecastDate(data.testing_period.end_date)} ({data.testing_period.days} days)</p><p>MAPE uses {data.model_metrics.mape_nonzero_days} nonzero-demand days; {data.model_metrics.mape_zero_days_excluded} zero-demand days excluded. Unavailable when all actual values are zero.</p><p>Model MAE minus baseline MAE: {formatForecastNumber(data.comparison.mae_difference)} units. A negative difference favors the model.</p></div>
    </> : null}
  </ForecastPanel>
}
