import { apiClient } from '@/api/client'
import type { InventoryMovement, MovementPage, MovementQuery } from '@/types/inventory-movement'

export const MOVEMENTS_PAGE_SIZE = 25

export const inventoryMovementsApi = {
  async list(query: MovementQuery, signal: AbortSignal): Promise<MovementPage> {
    // The API exposes ascending ID order only. Fetch the complete filtered
    // history before sorting so newest-first is correct across page boundaries.
    const records: InventoryMovement[] = []
    for (let offset = 0; ; offset += 100) {
      const { data } = await apiClient.get<InventoryMovement[]>('/api/inventory-movements', {
        params: { ...query, offset, limit: 100 }, signal,
      })
      records.push(...data)
      if (data.length < 100) break
    }
    records.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || b.id - a.id)
    return { items: records.slice(query.offset, query.offset + MOVEMENTS_PAGE_SIZE), hasNext: records.length > query.offset + MOVEMENTS_PAGE_SIZE }
  },
  async get(id: number, signal: AbortSignal): Promise<InventoryMovement> {
    return (await apiClient.get<InventoryMovement>(`/api/inventory-movements/${id}`, { signal })).data
  },
}
