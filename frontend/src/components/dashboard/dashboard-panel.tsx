import { CircleAlert, Inbox } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export function DashboardPanel({ title, description, children, className }: PropsWithChildren<{ title: string; description: string; className?: string }>) {
  return <section aria-label={title} className={cn('min-w-0 rounded-xl border bg-card shadow-card', className)}>
    <header className="border-b px-5 py-5 sm:px-6"><h2 className="text-sm font-semibold tracking-tight">{title}</h2><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p></header>
    {children}
  </section>
}

export function SectionError({ hasData = false }: { hasData?: boolean }) {
  return <p role="status" className="flex items-start gap-2 px-5 py-4 text-xs leading-5 text-destructive sm:px-6"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{hasData ? 'Unable to refresh this section. Showing previously loaded data.' : 'This section could not be loaded. Select Refresh to try again.'}</p>
}

export function EmptySection({ message }: { message: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-8 text-center"><Inbox className="size-6 text-muted-foreground" strokeWidth={1.4} aria-hidden="true" /><p className="text-sm text-muted-foreground">{message}</p></div>
}

export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-5 px-5 py-6 sm:px-6" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-4"><span className="size-9 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-muted motion-safe:animate-pulse" /><div className="h-2.5 w-1/3 rounded bg-muted motion-safe:animate-pulse" /></div></div>)}</div>
}
