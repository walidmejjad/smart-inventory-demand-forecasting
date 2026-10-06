import { Layers3, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { Link, NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { navigationGroups, navigationItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
}

export function AppSidebar({ collapsed = false, onToggle, onNavigate }: SidebarProps) {
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className={cn('flex h-24 shrink-0 items-center', collapsed ? 'justify-center px-3' : 'px-5')}>
      <Link to="/dashboard" onClick={onNavigate} aria-label="Smart Inventory overview" className="flex min-w-0 items-center gap-3 rounded-lg">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs"><Layers3 className="size-5" strokeWidth={1.6} aria-hidden="true" /></span>
        {!collapsed && <span className="min-w-0"><span className="block whitespace-nowrap text-sm font-semibold tracking-tight">Smart Inventory</span><span className="mt-0.5 block text-[10px] tracking-wide text-muted-foreground">Inventory Intelligence</span></span>}
      </Link>
    </div>
    <Tooltip.Provider delayDuration={200}>
      <nav aria-label="Main navigation" className={cn('flex-1 overflow-y-auto pb-6', collapsed ? 'px-3' : 'px-3.5')}>
        {navigationGroups.map((group) => <div key={group} className="mb-5 last:mb-0">
          {!collapsed ? <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{group}</p> : <div className="mb-2 h-3" aria-hidden="true" />}
          <ul className="space-y-1">
            {navigationItems.filter((item) => item.group === group).map(({ path, label, icon: Icon }) => {
              const link = <NavLink to={path} end onClick={onNavigate} aria-label={collapsed ? label : undefined} className={({ isActive }) => cn('sidebar-link relative flex h-10 items-center rounded-lg text-[13px] transition-colors focus-visible:outline-offset-2', collapsed ? 'justify-center' : 'gap-3 px-3', isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground')}>
                <Icon className="size-[18px] shrink-0" strokeWidth={1.65} aria-hidden="true" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>
              return <li key={path}>{collapsed ? <Tooltip.Root><Tooltip.Trigger asChild>{link}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="right" sideOffset={12} className="z-50 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-card">{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root> : link}</li>
            })}
          </ul>
        </div>)}
      </nav>
    </Tooltip.Provider>
    <div className={cn('shrink-0 border-t border-sidebar-border py-4', collapsed ? 'px-3' : 'px-4')}>
      {onToggle ? <Button variant="ghost" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className={cn('h-9 text-xs text-muted-foreground', collapsed ? 'w-full px-0' : 'w-full justify-start gap-3 px-2.5')}>
        {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden="true" /> : <PanelLeftClose className="size-[18px]" aria-hidden="true" />}
        {!collapsed && <span>Collapse sidebar</span>}
      </Button> : <p className="px-2 text-[11px] text-muted-foreground">Inventory &amp; demand intelligence</p>}
    </div>
  </div>
}
