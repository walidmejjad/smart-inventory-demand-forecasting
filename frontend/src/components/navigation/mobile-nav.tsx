import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { Button } from '@/components/ui/button'

export function MobileNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (media.matches) setOpen(false) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button variant="ghost" size="icon" className="size-9 lg:hidden" aria-label="Open navigation" aria-expanded={open}><Menu className="size-5" aria-hidden="true" /></Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="nav-overlay fixed inset-0 z-40 bg-black/35" />
      <Dialog.Content aria-describedby={undefined} className="mobile-nav-panel fixed inset-y-0 left-0 z-50 flex w-[min(290px,calc(100vw-24px))] flex-col border-r bg-sidebar text-sidebar-foreground shadow-lg">
        <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
        <Dialog.Close asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2 size-8" aria-label="Close navigation"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        <AppSidebar onNavigate={() => setOpen(false)} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
