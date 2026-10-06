import axios from 'axios'
import { toApiError } from '@/api/errors'
import { getApiBaseUrl } from '@/lib/config'
import { clearAccessToken, getAccessToken } from '@/lib/token-storage'

const unauthorizedListeners = new Set<() => void>()
export function subscribeToUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener)
  return () => { unauthorizedListeners.delete(listener) }
}

export const apiBaseUrl = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

/** Call /api/... endpoints. Vite forwards these requests to FastAPI in development. */
export const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? '/' : apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && config.url !== '/api/auth/login') config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Preserve cancellation so callers can distinguish an aborted request from a failure.
    if (axios.isCancel(error)) return Promise.reject(error)
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config?.url !== '/api/auth/login') {
      // A delayed response from an old session must not invalidate a newer login.
      const sentToken = error.config?.headers.get('Authorization')
      if (sentToken === `Bearer ${getAccessToken()}`) {
        clearAccessToken()
        unauthorizedListeners.forEach((listener) => listener())
      }
    }
    return Promise.reject(toApiError(error))
  },
)
