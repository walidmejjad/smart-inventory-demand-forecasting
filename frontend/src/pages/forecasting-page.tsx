import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { productsApi } from '@/api/products'
import { CatalogLoadError } from '@/components/catalog/catalog-ui'
import { ForecastChart } from '@/components/forecasting/forecast-chart'
import { ForecastEvaluation } from '@/components/forecasting/forecast-evaluation'
import { ForecastReorder } from '@/components/forecasting/forecast-reorder'
import { ForecastFailure, ForecastSkeleton } from '@/components/forecasting/forecast-ui'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/hooks/use-catalog'
import { useForecasting } from '@/hooks/use-forecasting'
import { formatForecastDate, formatForecastNumber, modelLabel } from '@/lib/forecasting-format'
import type { ForecastHorizon } from '@/types/forecasting'
export function ForecastingPage() {
  const products = useCatalog(productsApi)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [horizon, setHorizon] = useState<ForecastHorizon>(7)
  const product = products.data?.find((item) => item.id === selectedId) ?? products.data?.find((item) => item.sku === 'DEMO-FORECAST-001') ?? products.data?.[0] ?? null
  const data = useForecasting(product?.id ?? null, horizon)
  const forecast = data.forecast.data
  const total = forecast?.forecast.reduce((sum, day) => sum + day.predicted_demand, 0) ?? 0
  return <div>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Demand intelligence</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Demand Forecasting</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Forecast product demand and support smarter replenishment decisions.</p></div><Button size="icon" variant="outline" aria-label="Refresh forecasting" disabled={!product || data.forecast.loading || data.insight.loading || data.evaluation.loading} onClick={data.refresh}><RefreshCw aria-hidden="true" /></Button></div>
    {products.error && <CatalogLoadError title="Products" stale={!!products.data} onRetry={products.refresh} />}
    <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]"><div className="min-w-0"><label htmlFor="forecast-product" className="mb-2 block text-xs font-medium">Product</label><select id="forecast-product" className="catalog-input" disabled={!products.data?.length} value={product?.id ?? ''} onChange={(event) => setSelectedId(Number(event.currentTarget.value))}>{!products.data?.length && <option value="">{products.loading ? 'Loading products…' : 'No products available'}</option>}{products.data?.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select>{product && <p className="mt-2 break-words text-[11px] leading-5 text-muted-foreground sm:hidden">{product.name} · {product.sku}</p>}</div><div><label htmlFor="forecast-horizon" className="mb-2 block text-xs font-medium">Forecast horizon</label><select id="forecast-horizon" className="catalog-input" value={horizon} onChange={(event) => setHorizon(Number(event.currentTarget.value) as ForecastHorizon)}>{[7, 14, 30].map((days) => <option key={days} value={days}>{days} days</option>)}</select></div></div>
    {product?.sku === 'DEMO-FORECAST-001' && <p className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">Demo product — historical sales were simulated for development and demonstration.</p>}
    {products.loading && !product ? <ForecastSkeleton label="Loading forecasting workspace" chart /> : !product ? !products.error && <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Add a product through the existing Products workflow to view demand forecasts.</div> : <>
      <section aria-label="Forecast summary" className="mb-5 rounded-xl border bg-card p-5">
        {data.forecast.loading ? <ForecastSkeleton label="Loading forecast summary" /> : data.forecast.error ? <ForecastFailure error={data.forecast.error} message="Forecast couldn’t be generated." onRetry={data.forecast.retry} /> : forecast && <><dl className="grid gap-5 sm:grid-cols-3">{[['Forecast horizon', `${forecast.forecast.length} days`, 'horizon'], ['Predicted total demand', `${formatForecastNumber(total)} units`, 'total'], ['Average daily demand', `${formatForecastNumber(forecast.forecast.length ? total / forecast.forecast.length : 0)} units`, 'average']].map(([label, value, key]) => <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums" data-forecast-metric={key}>{value}</dd></div>)}</dl><p className="mt-4 text-[11px] leading-5 text-muted-foreground">Historical sales: {formatForecastDate(forecast.history_start)} – {formatForecastDate(forecast.history_end)} · {forecast.history_days} completed days</p></>}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]"><ForecastChart resource={data.forecast} /><ForecastReorder resource={data.insight} /></div>
      <div className="mt-5"><ForecastEvaluation resource={data.evaluation} /></div>
      <section className="mt-5 border-t pt-5 text-xs leading-6 text-muted-foreground" aria-label="Model information"><p className="font-medium text-foreground">Model · {modelLabel(forecast?.model ?? data.evaluation.data?.model_name ?? 'RandomForestRegressor')}</p><p>Machine-learning demand forecasting from historical sales patterns. Predictions support planning and do not guarantee future demand.</p></section>
    </>}
  </div>
}

