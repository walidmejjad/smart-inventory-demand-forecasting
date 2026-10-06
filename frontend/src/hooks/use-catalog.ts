import { useEffect, useState } from 'react'

interface ListApi<T> { list: (signal: AbortSignal) => Promise<T[]> }

export function useCatalog<T extends { id: number }>(api: ListApi<T>) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ data: T[] | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false })
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await api.list(controller.signal)
        if (!controller.signal.aborted) setState({ data, loading: false, error: false })
      } catch {
        if (!controller.signal.aborted) setState((old) => ({ ...old, loading: false, error: true }))
      }
    }
    void load()
    return () => controller.abort()
  }, [api, revision])

  function refresh() { setState((old) => ({ ...old, loading: true })); setRevision((value) => value + 1) }
  function accept(record: T) {
    setState((old) => ({ ...old, data: [...(old.data ?? []).filter((item) => item.id !== record.id), record].sort((a, b) => a.id - b.id) }))
    refresh()
  }
  function discard(id: number) { setState((old) => ({ ...old, data: (old.data ?? []).filter((item) => item.id !== id) })); refresh() }
  return { ...state, refresh, accept, discard }
}
