import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { apiClient, subscribeToUnauthorized } from '@/api/client'
import { AuthContext } from '@/context/auth-context'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/token-storage'
import type { LoginRequest, LoginResponse, User } from '@/types/auth'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const generation = useRef(0)
  const logout = useCallback(() => {
    generation.current += 1
    clearAccessToken()
    setUser(null)
    setIsLoading(false)
  }, [])

  useEffect(() => subscribeToUnauthorized(logout), [logout])

  useEffect(() => {
    const controller = new AbortController()
    const version = generation.current
    async function restore() {
      try {
        if (getAccessToken()) {
          const { data } = await apiClient.get<User>('/api/auth/me', { signal: controller.signal })
          if (!controller.signal.aborted && version === generation.current) setUser(data)
        }
      } catch {
        if (!controller.signal.aborted && version === generation.current) logout()
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void restore()
    return () => controller.abort()
  }, [logout])

  const login = useCallback(async (credentials: LoginRequest) => {
    const version = ++generation.current
    const { data } = await apiClient.post<LoginResponse>('/api/auth/login', credentials)
    if (version !== generation.current) return
    if (!data.access_token || !data.user) throw new Error('Invalid login response')
    setAccessToken(data.access_token)
    setUser(data.user)
  }, [])

  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, logout }}>{children}</AuthContext.Provider>
}
