/**
 * Thin client for the Worker's /api/sync/* routes — mirrors healthData.ts's
 * conventions exactly (base URL env var, x-api-key + passkey session header,
 * short timeout, never throws) so the sync layer degrades the same way the
 * rest of the app's network calls already do: unreachable Worker → the app
 * just keeps working off localStorage, nothing breaks.
 *
 * See atlas-api/src/sync.ts for the server-side design this talks to, and
 * ../hooks/useSyncedStorage.ts for the only caller.
 */

import { authHeaders, onUnauthorized } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

/** Shorter than healthData.ts's 3s — sync runs in the background on every edit, so a slow Worker shouldn't visibly stall typing/logging. */
const TIMEOUT_MS = 5000

function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

async function request(path: string, init: RequestInit): Promise<Response | null> {
  if (!API_BASE || !API_KEY) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(buildUrl(API_BASE, `/api/sync/${path}`), {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders(), ...init.headers },
    })
    if (res.status === 401) onUnauthorized()
    return res.ok ? res : null
  } catch (err) {
    console.warn(`[syncClient] ${path} failed`, err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface SyncPullResult<T> {
  value: T
  updatedAt: number
}

/**
 * GET /api/sync/{path} — the domain's current server value + when it was
 * last written. Returns null on any failure (never throws) so a caller
 * treats "couldn't reach the server" and "nothing synced yet" differently —
 * the latter still returns a real result (updatedAt: 0, the domain's empty
 * value), only the former returns null.
 */
export async function pullSync<T>(path: string): Promise<SyncPullResult<T> | null> {
  const res = await request(path, { method: 'GET' })
  if (!res) return null
  try {
    const json = (await res.json()) as SyncPullResult<T>
    return typeof json.updatedAt === 'number' ? json : null
  } catch {
    return null
  }
}

/**
 * POST /api/sync/{path} — push a domain's whole current value, tagged with
 * `updatedAt` (epoch ms). Returns whether the server actually accepted it
 * (false both on an unreachable Worker AND on a stale push the server's
 * last-write-wins check rejected — see pushDomain in atlas-api/src/sync.ts).
 */
export async function pushSync(path: string, value: unknown, updatedAt: number): Promise<boolean> {
  const res = await request(path, { method: 'POST', body: JSON.stringify({ value, updatedAt }) })
  if (!res) return false
  try {
    const json = (await res.json()) as { accepted?: boolean }
    return json.accepted === true
  } catch {
    return false
  }
}
