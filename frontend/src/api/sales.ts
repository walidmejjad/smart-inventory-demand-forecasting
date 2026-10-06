import { apiClient } from '@/api/client'
import type { Sale, SaleInput } from '@/types/sales'

export const SALES_PAGE_SIZE = 25
export interface SaleHistoryPage { items: Sale[]; hasNext: boolean }
export const salesApi = {
  async history(offset: number, search: string, signal: AbortSignal): Promise<SaleHistoryPage> {
    if (search) {
      // No backend Sale ID search exists. Preserve substring search across
      // history rather than silently limiting it to the current server page.
      const records = (await salesApi.list(signal)).filter((sale) => String(sale.id).includes(search))
      return { items: records.slice(offset, offset + SALES_PAGE_SIZE), hasNext: records.length > offset + SALES_PAGE_SIZE }
    }
    const { data } = await apiClient.get<Sale[]>('/api/sales', { params: { offset, limit: SALES_PAGE_SIZE + 1 }, signal })
    return { items: data.slice(0, SALES_PAGE_SIZE), hasNext: data.length > SALES_PAGE_SIZE }
  },
  async list(signal: AbortSignal) {
    const sales: Sale[] = []
    for (let offset = 0; ; offset += 100) {
      const { data } = await apiClient.get<Sale[]>('/api/sales', { params: { offset, limit: 100 }, signal })
      sales.push(...data)
      if (data.length < 100) return sales
    }
  },
  async get(id: number, signal: AbortSignal) { return (await apiClient.get<Sale>(`/api/sales/${id}`, { signal })).data },
  async create(input: SaleInput) { return (await apiClient.post<Sale>('/api/sales', input)).data },
}
