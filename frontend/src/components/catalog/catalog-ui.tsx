import { Check, PackageOpen, Plus, RefreshCw, X } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CatalogHeader({ title, description, singular, onAdd, onRefresh, loading }: { title: string; description: string; singular: string; onAdd: () => void; onRefresh: () => void; loading: boolean }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Your catalog</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label={`Refresh ${title.toLowerCase()}`} onClick={onRefresh} disabled={loading}><RefreshCw className={cn('size-4', loading && 'motion-safe:animate-spin')} aria-hidden="true" /></Button><Button data-catalog-primary-action onClick={onAdd}><Plus aria-hidden="true" />Add {singular}</Button></div></div>
}

export function CatalogFeedback({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div role="status" className="mb-5 flex items-center gap-3 rounded-lg border bg-accent/40 px-4 py-3 text-xs"><Check className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1">{message}</span><Button variant="ghost" size="icon-xs" aria-label="Dismiss notification" onClick={onDismiss}><X aria-hidden="true" /></Button></div> : null
}

export function CatalogLoadError({ title, stale, onRetry }: { title: string; stale: boolean; onRetry: () => void }) {
  return <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"><p className="text-xs leading-5">{title} couldn’t be loaded.{stale && ' Showing the previously loaded list.'}</p><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>
}

export function CatalogEmpty({ title, singular, onAdd }: { title: string; singular: string; onAdd: () => void }) {
  return <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-14 text-center"><PackageOpen className="size-7 text-muted-foreground" strokeWidth={1.3} aria-hidden="true" /><div><h2 className="text-sm font-medium">No {title.toLowerCase()} yet.</h2><p className="mt-2 text-xs text-muted-foreground">Add your first {singular} to get started.</p></div><Button variant="outline" size="sm" onClick={onAdd}><Plus aria-hidden="true" />Add {singular}</Button></div>
}

export function CatalogSkeleton() {
  return <div className="divide-y rounded-xl border bg-card" role="status" aria-label="Loading records"><span className="sr-only">Loading records…</span>{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-5 p-5" aria-hidden="true"><span className="size-9 rounded-lg bg-muted motion-safe:animate-pulse" /><span className="h-3 w-2/5 rounded bg-muted motion-safe:animate-pulse" /><span className="ml-auto h-3 w-12 rounded bg-muted motion-safe:animate-pulse" /></div>)}</div>
}

export function TableFrame({ children, label }: PropsWithChildren<{ label: string }>) {
  return <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-card lg:block" role="region" aria-label={label} tabIndex={0}>{children}</div>
}

export function Field({ name, label, error, children, hint }: { name: string; label: string; error?: string; children: ReactNode; hint?: string }) {
  return <div className="min-w-0"><label htmlFor={name} className="mb-2 block text-xs font-medium">{label}</label>{children}{hint && <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{hint}</p>}{error && <p id={`${name}-error`} className="mt-1.5 text-xs text-destructive">{error}</p>}</div>
}
