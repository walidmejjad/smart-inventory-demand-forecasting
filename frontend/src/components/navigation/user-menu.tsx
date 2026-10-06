import { ChevronDown, LogOut } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useAuth } from '@/hooks/use-auth'

export function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase()

  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button type="button" aria-label={`Open user menu for ${name}`} className="flex shrink-0 items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent sm:gap-3 sm:pr-2">
        <span className="flex size-8 items-center justify-center rounded-full border bg-secondary text-[11px] font-semibold tracking-wide sm:size-9" aria-hidden="true">{initials}</span>
        <span className="hidden max-w-36 truncate text-xs font-medium xl:block">{name}</span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={10} collisionPadding={12} className="user-menu z-50 w-64 max-w-[calc(100vw-24px)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
        <div className="px-3 py-3">
          <p className="break-words text-sm font-semibold">{name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
          <span className="mt-3 inline-flex rounded-md border bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground">{user.role}</span>
        </div>
        <DropdownMenu.Separator className="my-1 h-px bg-border" />
        <DropdownMenu.Item onSelect={logout} className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-xs outline-none focus:bg-accent focus:text-accent-foreground"><LogOut className="size-4" aria-hidden="true" />Sign out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}
