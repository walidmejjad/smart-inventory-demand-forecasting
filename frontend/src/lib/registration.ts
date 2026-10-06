import { ApiError } from '@/api/errors'
import type { RegisterRequest } from '@/types/auth'

export type RegistrationField = keyof RegisterRequest | 'confirm_password'
export type RegistrationErrors = Partial<Record<RegistrationField, string>>

export function validateRegistration(input: RegisterRequest, confirmation: string): RegistrationErrors {
  const errors: RegistrationErrors = {}
  for (const key of ['first_name', 'last_name'] as const) {
    const label = key === 'first_name' ? 'first name' : 'last name'
    const length = [...input[key].trim()].length
    if (!length) errors[key] = `Enter your ${label}.`
    else if (length > 100) errors[key] = `Use no more than 100 characters for your ${label}.`
  }
  if (!input.email.trim()) errors.email = 'Enter your email address.'
  else if ([...input.email.trim()].length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Enter a valid email address (up to 254 characters).'
  if (!input.password) errors.password = 'Enter a password.'
  else if ([...input.password].length < 12 || [...input.password].length > 128) errors.password = 'Use 12–128 characters for your password.'
  else if (!/\S/u.test(input.password) || new Set(input.password).size < 2) errors.password = 'Use a password or passphrase with more than one distinct character.'
  if (!confirmation) errors.confirm_password = 'Confirm your password.'
  else if (confirmation !== input.password) errors.confirm_password = 'Passwords do not match.'
  return errors
}

export function registrationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'An account with this email already exists.'
    if (error.status === 422) return 'Some details were not accepted. Review your name, email, and password and try again.'
    if (!error.status || error.status === 502 || error.status === 503 || error.status === 504) return 'Unable to connect to the server. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}
