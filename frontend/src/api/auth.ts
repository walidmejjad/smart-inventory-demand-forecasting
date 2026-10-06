import { apiClient } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { RegisterRequest, RegisterResponse } from '@/types/auth'

export async function registerAccount(input: RegisterRequest): Promise<RegisterResponse> {
  // Explicitly allowlist the backend fields, even if a caller passes extra properties.
  const { status, data } = await apiClient.post<unknown>('/api/auth/register', {
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    password: input.password,
  })
  // A generic 2xx response (e.g. a frontend fallback page) is not proof of registration.
  if (status !== 201 || !isRegisteredUser(data, input)) {
    throw new ApiError('Registration could not be confirmed.', { status: 502 })
  }
  return data
}

function isRegisteredUser(value: unknown, input: RegisterRequest): value is RegisterResponse {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return typeof user.id === 'number' && Number.isSafeInteger(user.id) && user.id > 0
    && user.email === input.email.trim().toLowerCase()
    && user.first_name === input.first_name.trim() && user.last_name === input.last_name.trim()
    && user.role === 'EMPLOYEE'
    && typeof user.created_at === 'string' && !Number.isNaN(Date.parse(user.created_at))
    && typeof user.updated_at === 'string' && !Number.isNaN(Date.parse(user.updated_at))
}
