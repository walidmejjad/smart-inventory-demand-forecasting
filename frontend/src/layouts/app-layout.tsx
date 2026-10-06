import { Outlet, useLocation } from 'react-router'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { collapsed, toggleSidebar } = useSidebar()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh bg-background">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside aria-label="Desktop sidebar" className={cn('app-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex', collapsed ? 'w-[76px]' : 'w-[248px]')}>
        <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div key={pathname} className="page-entry"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
