import { CheckCircle2, CircleAlert } from 'lucide-react'
import { ForecastFailure, ForecastPanel, ForecastSkeleton } from '@/components/forecasting/forecast-ui'
import type { ForecastResource } from '@/hooks/use-forecasting'
import { formatForecastDate, formatForecastNumber } from '@/lib/forecasting-format'
import type { ReorderInsight } from '@/types/forecasting'
export function ForecastReorder({ resource }: { resource: ForecastResource<ReorderInsight> }) {
  const data = resource.data
  return <ForecastPanel title="Replenishment insight" description="Advisory only · no inventory changes">
    {resource.loading ? <ForecastSkeleton label="Loading reorder insight" /> : resource.error ? <ForecastFailure secondary error={resource.error} message="Reorder insight couldn’t be loaded." onRetry={resource.retry} /> : data ? <>
      <div className={`flex items-center gap-2 text-sm font-semibold ${data.reorder_recommended ? 'text-amber-800 dark:text-amber-300' : ''}`}>{data.reorder_recommended ? <CircleAlert aria-hidden="true" className="size-4 shrink-0" /> : <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />}<span>{data.reorder_recommended ? 'Reorder recommended' : 'No reorder needed'}</span></div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">After {formatForecastNumber(data.predicted_total_demand)} units of predicted demand, projected stock is {formatForecastNumber(data.projected_stock_after_forecast)} units — {data.reorder_recommended ? 'at or below' : 'above'} the reorder level of {data.reorder_level}.</p>
      <dl className="mt-5 space-y-3 border-t pt-4 text-xs">{[
        ['Current stock', data.current_stock, 'stock'], ['Reorder level', data.reorder_level, 'reorder'], ['Predicted demand', data.predicted_total_demand, 'demand'], ['Projected stock', data.projected_stock_after_forecast, 'projected'],
      ].map(([label, value, key]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums" data-insight-metric={key}>{formatForecastNumber(Number(value))} units</dd></div>)}</dl>
      <p className="mt-5 text-[11px] leading-5 text-muted-foreground">{data.forecast_horizon_days} days · {formatForecastDate(data.forecast_start)} – {formatForecastDate(data.forecast_end)}</p>
    </> : null}
  </ForecastPanel>
}
