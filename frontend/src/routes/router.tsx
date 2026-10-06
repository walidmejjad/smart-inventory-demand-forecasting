import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'
import { AppLayout } from '@/layouts/app-layout'
import { DashboardPage } from '@/pages/dashboard-page'
import { ProductsPage } from '@/pages/products-page'
import { CategoriesPage } from '@/pages/categories-page'
import { SuppliersPage } from '@/pages/suppliers-page'
import { SalesPage } from '@/pages/sales-page'
import { InventoryMovementsPage } from '@/pages/inventory-movements-page'
import { AlertsPage } from '@/pages/alerts-page'
import { ForecastingPage } from '@/pages/forecasting-page'
import { ModulePlaceholderPage } from '@/pages/module-placeholder-page'
import { navigationItems } from '@/lib/navigation'
import { GuestRoute, ProtectedRoute } from '@/routes/auth-routes'
import { RouteErrorBoundary } from '@/routes/route-error-boundary'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { element: <GuestRoute />, children: [{ path: 'login', element: <LoginPage /> }, { path: 'register', element: <RegisterPage /> }] },
      { element: <ProtectedRoute />, children: [
        { path: 'app', element: <Navigate to="/dashboard" replace /> },
        { element: <AppLayout />, children: navigationItems.map(({ path }) => ({ path: path.slice(1), element: path === '/dashboard' ? <DashboardPage /> : path === '/products' ? <ProductsPage /> : path === '/categories' ? <CategoriesPage /> : path === '/suppliers' ? <SuppliersPage /> : path === '/sales' ? <SalesPage /> : path === '/inventory-movements' ? <InventoryMovementsPage /> : path === '/alerts' ? <AlertsPage /> : path === '/forecasting' ? <ForecastingPage /> : <ModulePlaceholderPage /> })) },
      ] },
    ],
  },
])


