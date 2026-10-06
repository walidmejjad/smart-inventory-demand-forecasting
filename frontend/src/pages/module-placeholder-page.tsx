import { useLocation } from 'react-router'
import { getCurrentPage } from '@/lib/navigation'

export function ModulePlaceholderPage() {
  const { pathname } = useLocation()
  const { title, description, icon: Icon } = getCurrentPage(pathname)
  return <section aria-labelledby="page-title">
    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Your workspace</p>
    <h1 id="page-title" className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
    <div className="mt-8 flex items-start gap-4 border-t pt-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card"><Icon className="size-[18px] text-muted-foreground" strokeWidth={1.5} aria-hidden="true" /></span>
      <div className="pt-0.5"><p className="text-sm font-medium">Coming soon</p><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p></div>
    </div>
  </section>
}
