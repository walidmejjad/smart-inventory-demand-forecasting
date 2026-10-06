import axios from 'axios'
import type { ValidationIssue } from '@/types/api'

export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly validationIssues: ValidationIssue[]

  constructor(message: string, options: {
    status?: number
    code?: string
    validationIssues?: ValidationIssue[]
  } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.validationIssues = options.validationIssues ?? []
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readValidationIssues(detail: unknown): ValidationIssue[] {
  if (!Array.isArray(detail)) return []

  return detail.filter(isRecord).flatMap((issue) => {
    if (typeof issue.msg !== 'string' || !Array.isArray(issue.loc)) return []
    return [{
      location: issue.loc.filter((part): part is string | number =>
        typeof part === 'string' || typeof part === 'number'),
      message: issue.msg,
      type: typeof issue.type === 'string' ? issue.type : 'validation_error',
    }]
  })
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!axios.isAxiosError<unknown>(error)) {
    return new ApiError('An unexpected error occurred. Please try again.')
  }

  const status = error.response?.status
  const data = error.response?.data
  const detail = isRecord(data) ? data.detail : undefined
  const validationIssues = readValidationIssues(detail)
  let message = 'The request could not be completed. Please try again.'

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    message = 'The request timed out. Please try again.'
  } else if (!error.response) {
    message = 'Unable to reach the server. Check your connection and try again.'
  } else if (status && status >= 500) {
    message = 'The service is temporarily unavailable. Please try again shortly.'
  } else if (validationIssues.length) {
    message = 'Some values are invalid. Review your input and try again.'
  } else if (typeof detail === 'string' && detail.trim()) {
    message = detail
  }

  return new ApiError(message, { status, code: error.code, validationIssues })
}
