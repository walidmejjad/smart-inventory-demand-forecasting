import { useEffect, useState } from 'react'
import { ApiError } from '@/api/errors'
import { inventoryMovementsApi } from '@/api/inventory-movements'
import { CatalogSkeleton } from '@/components/catalog/catalog-ui'
import { Button } from '@/components/ui/button'
import { MovementBadge, MovementDate, QuantityChange } from '@/components/inventory-movements/movement-ui'
import type { Product } from '@/types/catalog'
import type { InventoryMovement } from '@/types/inventory-movement'

export function MovementDetails({ id, products, onSale }: { id: number; products: Product[]; onSale: (id: number) => void }) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ movement: InventoryMovement | null; error: string }>({ movement: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    void inventoryMovementsApi.get(id, controller.signal).then((movement) => {
      if (!controller.signal.aborted) setState({ movement, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ movement: null, error: error instanceof ApiError && error.status === 404 ? 'Movement not found.' : 'Movement details couldn’t be loaded.' })
    })
    return () => controller.abort()
  }, [id, revision])
  if (state.error) return <div role="alert" className="space-y-3"><p className="text-sm">{state.error}</p><Button variant="outline" onClick={() => { setState({ movement: null, error: '' }); setRevision((old) => old + 1) }}>Retry</Button></div>
  if (!state.movement) return <CatalogSkeleton />
  const movement = state.movement
  const product = products.find((item) => item.id === movement.product_id)
  return <div className="space-y-5"><div><p className="break-words text-base font-medium">{product?.name ?? `Product #${movement.product_id}`}</p>{product?.sku && <p className="mt-1 break-words text-xs text-muted-foreground">{product.sku}</p>}</div>
    <dl className="grid gap-5 sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Movement ID</dt><dd className="mt-2 text-sm">#{movement.id}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Movement type</dt><dd className="mt-2"><MovementBadge type={movement.movement_type} /></dd></div>
      <div><dt className="text-xs text-muted-foreground">Quantity change</dt><dd className="mt-2"><QuantityChange value={movement.quantity_change} /></dd></div>
      <div><dt className="text-xs text-muted-foreground">Related sale</dt><dd className="mt-2 text-sm">{movement.sale_id !== null ? <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onSale(movement.sale_id!)}>Sale #{movement.sale_id}</Button> : '—'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Created by</dt><dd className="mt-2 text-sm">User #{movement.created_by_id}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Created at</dt><dd className="mt-2 text-xs"><MovementDate value={movement.created_at} /></dd></div>
    </dl>
    {movement.movement_type === 'SALE' && movement.sale_id !== null && <p className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">This movement was created automatically when Sale #{movement.sale_id} was completed.</p>}
    <p className="text-xs leading-5 text-muted-foreground">Inventory movements are read-only audit records.</p>
  </div>
}
