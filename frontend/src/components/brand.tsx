import { Layers3 } from 'lucide-react'

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 sm:gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs sm:size-10">
        <Layers3 className="size-5" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight sm:text-base">Smart Inventory</span>
    </span>
  )
}
