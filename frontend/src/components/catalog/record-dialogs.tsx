import { X } from 'lucide-react'
import { AlertDialog, Dialog } from 'radix-ui'
import { useRef, type PropsWithChildren } from 'react'
import { Button } from '@/components/ui/button'

export function RecordDialog({ open, title, description, busy, onClose, children }: PropsWithChildren<{ open: boolean; title: string; description: string; busy: boolean; onClose: () => void }>) {
  const previousFocus = useRef<HTMLElement | null>(null)
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}><Dialog.Portal><Dialog.Overlay className="nav-overlay fixed inset-0 z-40 bg-black/40" /><Dialog.Content onOpenAutoFocus={() => { previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={(event) => { event.preventDefault(); const previous = previousFocus.current; if (previous?.isConnected && previous !== document.body) previous.focus(); else document.querySelector<HTMLElement>('[data-catalog-primary-action]')?.focus() }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => { if (busy) event.preventDefault() }} className="record-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-card shadow-lg">
    <header className="shrink-0 border-b p-5 pr-12 sm:px-6"><Dialog.Title className="text-base font-semibold tracking-tight">{title}</Dialog.Title><Dialog.Description className="mt-2 text-xs leading-5 text-muted-foreground">{description}</Dialog.Description><Dialog.Close asChild><Button variant="ghost" size="icon-sm" className="absolute right-3 top-4" disabled={busy} aria-label="Close dialog"><X aria-hidden="true" /></Button></Dialog.Close></header>
    <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}

export function DeleteDialog({ name, singular, open, busy, error, onClose, onConfirm }: { name: string; singular: string; open: boolean; busy: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  const previousName = useRef(name)
  return <AlertDialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}><AlertDialog.Portal><AlertDialog.Overlay className="nav-overlay fixed inset-0 z-40 bg-black/40" /><AlertDialog.Content onOpenAutoFocus={() => { previousName.current = name }} onCloseAutoFocus={(event) => { event.preventDefault(); const trigger = [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find((button) => button.getAttribute('aria-label') === `Actions for ${previousName.current}` && button.offsetParent !== null); (trigger ?? document.querySelector<HTMLElement>('[data-catalog-primary-action]'))?.focus() }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} className="record-dialog fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-lg">
    <AlertDialog.Title className="break-words text-base font-semibold">Delete “{name}”?</AlertDialog.Title><AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">This action cannot be undone. Only this {singular} will be deleted.</AlertDialog.Description>
    {error && <p role="alert" className="mt-4 text-xs leading-5 text-destructive">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="outline" disabled={busy}>Cancel</Button></AlertDialog.Cancel><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : `Delete ${singular}`}</Button></div>
  </AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>
}
