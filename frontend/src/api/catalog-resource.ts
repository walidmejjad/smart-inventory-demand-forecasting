import { apiClient } from '@/api/client'

export function catalogResource<T, Input extends object>(path: string) {
  return {
    async list(signal: AbortSignal): Promise<T[]> {
      const records: T[] = []
      for (let offset = 0; ; offset += 100) {
        const { data } = await apiClient.get<T[]>(path, { params: { offset, limit: 100 }, signal })
        records.push(...data)
        if (data.length < 100) return records
      }
    },
    async get(id: number, signal?: AbortSignal) { return (await apiClient.get<T>(`${path}/${id}`, { signal })).data },
    async create(input: Input) { return (await apiClient.post<T>(path, input)).data },
    async update(id: number, input: Partial<Input>) { return (await apiClient.put<T>(`${path}/${id}`, input)).data },
    async remove(id: number) { await apiClient.delete(`${path}/${id}`) },
  }
}
