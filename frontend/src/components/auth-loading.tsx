import { LoaderCircle } from 'lucide-react'
import { Brand } from '@/components/brand'

export function AuthLoading() {
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-background" aria-busy="true" aria-label="Checking your session">
    <Brand />
    <p role="status" className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Checking your session…</p>
  </main>
}
