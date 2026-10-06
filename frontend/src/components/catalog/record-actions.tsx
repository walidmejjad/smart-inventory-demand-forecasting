import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Button } from '@/components/ui/button'

export function RecordActions({ name, onEdit, onDelete, onView }: { name: string; onEdit: () => void; onDelete: () => void; onView?: () => void }) {
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}><MoreHorizontal className="size-4" aria-hidden="true" /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={5} collisionPadding={12} className="user-menu z-50 min-w-36 rounded-lg border bg-popover p-1 shadow-card">
    {onView && <DropdownMenu.Item className="catalog-menu-item" onSelect={onView}><Eye aria-hidden="true" />View details</DropdownMenu.Item>}
    <DropdownMenu.Item className="catalog-menu-item" onSelect={onEdit}><Pencil aria-hidden="true" />Edit</DropdownMenu.Item>
    <DropdownMenu.Separator className="my-1 h-px bg-border" />
    <DropdownMenu.Item className="catalog-menu-item text-destructive" onSelect={onDelete}><Trash2 aria-hidden="true" />Delete</DropdownMenu.Item>
  </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
}
