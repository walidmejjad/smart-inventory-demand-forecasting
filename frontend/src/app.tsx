import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router/dom'
import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/context/theme-provider'
import { AuthProvider } from '@/context/auth-provider'
import { router } from '@/routes/router'

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <AuthProvider><RouterProvider router={router} /></AuthProvider>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
