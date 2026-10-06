import { ArrowLeftRight, ChartNoAxesCombined, Layers3, LayoutDashboard, Package, ReceiptText, TriangleAlert, Truck, type LucideIcon } from 'lucide-react'

interface NavigationItem {
  path: string
  label: string
  title: string
  description: string
  icon: LucideIcon
  group: 'Workspace' | 'Operations' | 'Intelligence'
}

export const navigationItems = [
  { path: '/dashboard', label: 'Overview', title: 'Overview', description: 'Inventory today. Sales across all time.', icon: LayoutDashboard, group: 'Workspace' },
  { path: '/products', label: 'Products', title: 'Products', description: 'Manage your product catalog, pricing, stock levels, and reorder thresholds.', icon: Package, group: 'Workspace' },
  { path: '/categories', label: 'Categories', title: 'Categories', description: 'Organize products into clear inventory groups.', icon: Layers3, group: 'Workspace' },
  { path: '/suppliers', label: 'Suppliers', title: 'Suppliers', description: 'Manage supplier contacts and sourcing information.', icon: Truck, group: 'Workspace' },
  { path: '/sales', label: 'Sales', title: 'Sales', description: 'Sales management will be added in a future stage.', icon: ReceiptText, group: 'Operations' },
  { path: '/inventory-movements', label: 'Inventory Movements', title: 'Inventory Movements', description: 'Inventory movement tracking will be added in a future stage.', icon: ArrowLeftRight, group: 'Operations' },
  { path: '/alerts', label: 'Alerts', title: 'Alerts', description: 'Inventory alerts will be added in a future stage.', icon: TriangleAlert, group: 'Intelligence' },
  { path: '/forecasting', label: 'Forecasting', title: 'Forecasting', description: 'Demand forecasting will be added in a future stage.', icon: ChartNoAxesCombined, group: 'Intelligence' },
] as const satisfies readonly NavigationItem[]

export const navigationGroups = ['Workspace', 'Operations', 'Intelligence'] as const

export function getCurrentPage(pathname: string) {
  return navigationItems.find((item) => item.path === pathname.replace(/\/+$/, '')) ?? navigationItems[0]
}
