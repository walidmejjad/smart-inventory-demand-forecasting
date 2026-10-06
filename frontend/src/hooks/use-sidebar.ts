import { useState } from 'react'

const SIDEBAR_STORAGE_KEY = 'smart-inventory.sidebar-collapsed'

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.sessionStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' }
    catch { return false }
  })

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    try { window.sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)) }
    catch { /* Navigation still works when storage is unavailable. */ }
  }

  return { collapsed, toggleSidebar }
}
