import { Check, LogOut } from 'lucide-react'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function AuthPlaceholderPage() {
  const { user, logout } = useAuth()
  return <div className="min-h-dvh bg-background">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6"><Brand /><ThemeToggle /></header>
    <main id="main-content" className="mx-auto max-w-lg px-6 py-20">
      <div className="rounded-xl border bg-card p-8 shadow-card">
        <span className="mb-7 inline-flex size-11 items-center justify-center rounded-full bg-accent"><Check className="size-5" aria-hidden="true" /></span>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">You’re signed in</p>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{user?.first_name ? `, ${user.first_name}` : ''}.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Your session is verified. Your Smart Inventory workspace will be available in a future stage.</p>
        <Button variant="outline" className="mt-8" onClick={logout}><LogOut aria-hidden="true" />Sign out</Button>
      </div>
    </main>
  </div>
}
