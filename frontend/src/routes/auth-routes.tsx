import { Navigate, Outlet } from 'react-router'
import { AuthLoading } from '@/components/auth-loading'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) return <AuthLoading />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export function GuestRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) return <AuthLoading />
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
