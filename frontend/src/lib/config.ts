const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'

/** Backend origin (or deployment prefix), without an /api suffix. */
export function getApiBaseUrl(value?: string): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL

  try {
    const url = new URL(candidate)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password || url.search || url.hash
    ) {
      throw new Error('Unsupported API URL')
    }
    return url.toString().replace(/\/+$/, '')
  } catch {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.')
  }
}
