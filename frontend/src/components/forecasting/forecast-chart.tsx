import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ForecastPanel, ForecastSkeleton, ForecastFailure } from '@/components/forecasting/forecast-ui'
import type { ForecastResource } from '@/hooks/use-forecasting'
import { formatForecastDate, formatForecastNumber } from '@/lib/forecasting-format'
import type { ForecastResponse } from '@/types/forecasting'
export function ForecastChart({ resource }: { resource: ForecastResource<ForecastResponse> }) {
  return <ForecastPanel title="Predicted daily demand" description="Daily units · forecast dates in UTC">
    {resource.loading ? <ForecastSkeleton label="Loading forecast chart" chart /> : resource.error ? <ForecastFailure secondary error={resource.error} message="Forecast couldn’t be generated." onRetry={resource.retry} /> : resource.data ? <>
      <div className="h-72 min-w-0" role="img" aria-label="Line chart of predicted daily demand. Exact values are available in the daily predictions table below.">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={resource.data.forecast} margin={{ top: 12, right: 12, bottom: 8, left: -18 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(value: string) => formatForecastDate(value).replace(/ \d{4}$/, '')} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={35} />
            <YAxis domain={[0, 'auto']} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={formatForecastNumber} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(value) => formatForecastDate(String(value))} formatter={(value) => [`${formatForecastNumber(Number(value))} units`, 'Predicted demand']} contentStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} itemStyle={{ color: 'var(--foreground)' }} cursor={{ stroke: 'var(--border)' }} />
            <Line type="linear" dataKey="predicted_demand" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-4 border-t pt-4"><summary className="cursor-pointer rounded text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4">Daily predictions · accessible data table</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Backend daily demand predictions in units</caption><thead><tr className="border-b"><th scope="col" className="py-2">Forecast date</th><th scope="col" className="py-2 text-right">Predicted units</th></tr></thead><tbody>{resource.data.forecast.map((day) => <tr key={day.date} className="border-b last:border-0"><th scope="row" className="py-2 font-normal">{formatForecastDate(day.date)}</th><td className="py-2 text-right tabular-nums" data-prediction-date={day.date} data-predicted-demand={day.predicted_demand}>{formatForecastNumber(day.predicted_demand)}</td></tr>)}</tbody></table></div></details>
    </> : null}
  </ForecastPanel>
}
