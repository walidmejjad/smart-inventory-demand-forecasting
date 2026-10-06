import { TableFrame } from '@/components/catalog/catalog-ui'
import { MovementBadge, MovementDate, QuantityChange } from '@/components/inventory-movements/movement-ui'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types/catalog'
import type { InventoryMovement } from '@/types/inventory-movement'

export function MovementsList({ movements, products, onView, onSale }: { movements: InventoryMovement[]; products: Product[]; onView: (id: number) => void; onSale: (id: number) => void }) {
  function productInfo(id: number) {
    const product = products.find((item) => item.id === id)
    return <div className="min-w-0"><p className="break-words font-medium">{product?.name ?? `Product #${id}`}</p>{product?.sku && <p className="mt-1 break-words text-[10px] text-muted-foreground">{product.sku}</p>}</div>
  }
  function relatedSale(movement: InventoryMovement) {
    const id = movement.sale_id
    return id !== null ? <Button variant="link" size="sm" className="h-auto p-0 text-xs" aria-label={`View sale #${id} for movement #${movement.id}`} onClick={() => onSale(id)}>Sale #{id}</Button> : <span className="text-muted-foreground">—</span>
  }
  return <>
    <TableFrame label="Inventory movement history"><table className="w-full text-left text-xs"><caption className="sr-only">Read-only inventory movements in ascending backend ID order.</caption><thead className="border-b bg-muted/30 text-[10px] text-muted-foreground"><tr>{['Date / time', 'Product', 'Type', 'Change', 'Related sale', 'Created by', 'Details'].map((label) => <th scope="col" key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
      <tbody className="divide-y">{movements.map((movement) => <tr key={movement.id} className="hover:bg-muted/20"><td className="px-3 py-4 align-top"><MovementDate value={movement.created_at} /><p className="mt-1 text-[10px] text-muted-foreground">Movement #{movement.id}</p></td><th scope="row" className="max-w-60 px-3 py-4 align-top font-normal">{productInfo(movement.product_id)}</th><td className="px-3 py-4 align-top"><MovementBadge type={movement.movement_type} /></td><td className="px-3 py-4 align-top whitespace-nowrap"><QuantityChange value={movement.quantity_change} /></td><td className="px-3 py-4 align-top">{relatedSale(movement)}</td><td className="px-3 py-4 align-top whitespace-nowrap">User #{movement.created_by_id}</td><td className="px-3 py-4 align-top"><Button size="sm" variant="ghost" aria-label={`View movement #${movement.id}`} onClick={() => onView(movement.id)}>View details</Button></td></tr>)}</tbody>
    </table></TableFrame>
    <div className="space-y-3 lg:hidden">{movements.map((movement) => <article key={movement.id} className="rounded-xl border bg-card p-4 text-xs"><div className="flex items-start justify-between gap-3">{productInfo(movement.product_id)}<span className="shrink-0"><QuantityChange value={movement.quantity_change} /></span></div><div className="mt-3 flex flex-wrap items-center gap-3"><MovementBadge type={movement.movement_type} /><MovementDate value={movement.created_at} /></div><div className="mt-3 flex flex-wrap justify-between gap-3"><span className="text-muted-foreground">Movement #{movement.id} · User #{movement.created_by_id}</span><span>{relatedSale(movement)}</span></div><Button size="sm" variant="outline" className="mt-3" aria-label={`View movement #${movement.id}`} onClick={() => onView(movement.id)}>View details</Button></article>)}</div>
  </>
}
