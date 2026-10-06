export type SupportedMovementType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT'

export interface InventoryMovement {
  id: number
  product_id: number
  /** Preserve future backend values instead of discarding unknown types. */
  movement_type: string
  quantity_change: number
  sale_id: number | null
  created_by_id: number
  created_at: string
}

export interface MovementQuery {
  offset: number
  product_id?: number
  movement_type?: SupportedMovementType
  sale_id?: number
}

export interface MovementPage { items: InventoryMovement[]; hasNext: boolean }
