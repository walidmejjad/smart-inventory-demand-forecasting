import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { ForecastError } from '@/hooks/use-forecasting'
export function ForecastPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border bg-card"><div className="border-b px-5 py-4"><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div><div className="p-5">{children}</div></section>
}
export function ForecastSkeleton({ label, chart = false }: { label: string; chart?: boolean }) {
  return <div role="status" aria-label={label} className={`space-y-4 motion-safe:animate-pulse ${chart ? 'h-72' : 'min-h-36'}`}><div className="h-4 w-2/3 rounded bg-muted" /><div className={`${chart ? 'h-56' : 'h-20'} rounded-lg bg-muted/60`} /><span className="sr-only">{label}</span></div>
}
export function ForecastFailure({ error, message, onRetry, secondary = false }: { error: ForecastError; message: string; onRetry: () => void; secondary?: boolean }) {
  const unavailable = error === 'history' || error === 'unavailable'
  if (secondary && unavailable) return <div className="min-h-36 rounded-lg border border-dashed bg-muted/20 p-4"><p className="text-xs text-muted-foreground">Unavailable for this product.</p><Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>
  return <div role="alert" className="min-h-36"><p className="text-sm font-medium">{unavailable ? 'Forecast unavailable for this product.' : message}</p>{error === 'history' && <p className="mt-2 text-xs leading-5 text-muted-foreground">More historical sales data is required before a reliable forecast can be generated.</p>}<Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>
}
