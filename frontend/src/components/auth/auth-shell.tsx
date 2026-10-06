import type { PropsWithChildren } from 'react'
import { Box, Layers3, ScanLine, Sparkles } from 'lucide-react'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'

export function AuthShell({ children, skipLabel = 'Skip to sign in' }: PropsWithChildren<{ skipLabel?: string }>) {
  return <div className="login-shell min-h-dvh bg-background">
    <a href="#main-content" className="skip-link">{skipLabel}</a>
    <div className="mx-auto grid min-h-dvh max-w-[1600px] lg:grid-cols-[1.05fr_1fr]">
      <aside className="login-story relative m-4 hidden overflow-hidden rounded-2xl border p-10 lg:flex lg:flex-col xl:m-6 xl:p-12">
        <Brand />
        <div className="my-auto py-12">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Clarity at every level</p>
          <h2 className="max-w-md text-4xl font-semibold leading-[1.18] tracking-[-0.04em] xl:text-[46px]">A clearer view.<br />A smarter next move.</h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">Bring your inventory into focus. Make confident decisions about what comes next.</p>
          <div className="inventory-motif" aria-hidden="true">
            <div className="motif-orbit" />
            <div className="motif-grid">{Array.from({ length: 9 }, (_, i) => <span key={i} className={`motif-tile motif-tile-${i}`}><Box strokeWidth={1} /></span>)}</div>
            <span className="motif-label"><Layers3 className="size-4" />Connected by intelligence</span>
          </div>
          <ul className="space-y-4 text-sm">
            {[{ icon: ScanLine, text: 'Real-time inventory visibility' }, { icon: Sparkles, text: 'Demand forecasting' }, { icon: Box, text: 'Smarter reorder decisions' }].map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-3"><Icon className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />{text}</li>)}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Inventory Intelligence &amp; Demand Forecasting</p>
      </aside>
      <div className="flex min-h-dvh flex-col px-6 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-3 py-6 lg:justify-end"><span className="lg:hidden"><Brand /></span><ThemeToggle /></header>
        <main id="main-content" className="flex flex-1 items-center justify-center py-12">
          <div className="login-form-entry w-full max-w-[380px]">{children}
          </div>
        </main>
        <footer className="pb-6 text-center text-[11px] leading-5 text-muted-foreground">Smart Inventory <span aria-hidden="true" className="mx-2">·</span> Inventory Intelligence &amp; Demand Forecasting</footer>
      </div>
    </div>
  </div>
}
