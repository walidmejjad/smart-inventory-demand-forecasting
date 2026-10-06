const TOKEN_KEY = 'smart-inventory.access-token'

export function getAccessToken(): string | null {
  try { return window.sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setAccessToken(token: string): void {
  // Fail sign-in safely if persistence is blocked rather than claiming a saved session.
  window.sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  try { window.sessionStorage.removeItem(TOKEN_KEY) } catch { /* Storage may be disabled. */ }
}
