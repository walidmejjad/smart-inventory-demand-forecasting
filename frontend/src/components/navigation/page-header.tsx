import { ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { UserMenu } from '@/components/navigation/user-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { getCurrentPage } from '@/lib/navigation'

export function PageHeader() {
  const { pathname } = useLocation()
  const page = getCurrentPage(pathname)
  return <header className="flex min-h-[72px] items-center justify-between gap-2 border-b bg-card px-4 py-3 sm:px-6 lg:px-8">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <MobileNav />
      <div aria-label="Current page" className="flex min-w-0 items-center gap-2 text-xs">
        <span className="hidden text-muted-foreground sm:inline">Workspace</span>
        <ChevronRight className="hidden size-3 text-muted-foreground sm:block" aria-hidden="true" />
        <span className="truncate font-medium">{page.title}</span>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-4"><ThemeToggle /><span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" /><UserMenu /></div>
  </header>
}
