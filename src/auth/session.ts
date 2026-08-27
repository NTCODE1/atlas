/**
 * Passkey session-token storage for the Apex PWA.
 *
 * The token is a Worker-signed HMAC string (`<payload>.<sig>`) obtained after a
 * successful passkey unlock (see `passkey.ts`). We keep it in localStorage and
 * attach it as a Bearer header on every API call (see `authHeaders`). We only
 * *read* the expiry client-side to decide when to re-prompt — the Worker is the
 * authority that actually verifies the signature.
 */

const KEY = 'atlas.session'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* private mode / storage disabled — unlock just won't persist */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Read the `exp` (epoch seconds) out of the token payload, or null if unreadable. */
function tokenExpiry(token: string): number | null {
  const [payload] = token.split('.')
  if (!payload) return null
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const { exp } = JSON.parse(atob(padded))
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

/** True when a stored token exists and hasn't expired. */
export function hasValidToken(): boolean {
  const token = getToken()
  if (!token) return false
  const exp = tokenExpiry(token)
  return exp !== null && exp > Math.floor(Date.now() / 1000)
}

/**
 * Headers to merge into an API request: the session Bearer token when present.
 * Callers keep sending `x-api-key` alongside this.
 */
export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Call when the Worker rejects a request with 401: drop the (now useless) token
 * and notify the app so the unlock screen can re-appear without a full reload.
 */
export function onUnauthorized(): void {
  clearToken()
  try {
    window.dispatchEvent(new Event('atlas:unauthorized'))
  } catch {
    /* ignore */
  }
}
