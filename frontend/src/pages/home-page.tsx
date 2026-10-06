import { Layers3 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'

export function HomePage() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Smart Inventory &amp; Demand Forecasting</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Workspace</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">A clear foundation for what comes next.</p>
        </div>
        <span className="inline-flex items-center rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">Stage 01 · Foundation</span>
      </div>

      <Card className="flex flex-1 justify-center overflow-hidden py-0 shadow-card">
        <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center sm:min-h-96 sm:py-24">
          <div className="mb-7 flex size-16 items-center justify-center rounded-2xl border bg-muted/50 shadow-xs">
            <Layers3 className="size-7 text-foreground/75" strokeWidth={1.25} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-medium tracking-tight sm:text-2xl">Your workspace is taking shape.</h2>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
            The foundation is ready. Inventory and demand planning tools will arrive in the next stages.
          </p>
          <div className="mt-9 h-px w-10 bg-border" aria-hidden="true" />
          <p className="mt-6 text-xs text-muted-foreground">Designed for clarity. Built to grow.</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
