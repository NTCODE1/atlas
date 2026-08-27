/**
 * Social-media follower-history fetcher for the Atlas "Social" tab.
 *
 * Mirrors healthData.ts: reads from the atlas-api Worker (GET /api/social),
 * degrades to an empty result if the Worker is unset / unreachable / slow, and
 * never throws. Unlike the sync hooks this is read-only, server-owned data —
 * the Worker's daily cron is what writes it (see atlas-api/src/social.ts).
 */

import { authHeaders, onUnauthorized } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined
const TIMEOUT_MS = 4000

export type SocialPlatform = 'instagram' | 'tiktok'

export interface SocialPoint {
  date: string
  followers: number | null
  following: number | null
  posts: number | null
  likes: number | null
}

export interface SocialAccount {
  account: string
  platform: SocialPlatform
  label: string
  username: string | null
  lastSyncAt: number | null
  lastError: string | null
  points: SocialPoint[]
}

export interface SocialHistory {
  accounts: SocialAccount[]
}

/** What the tab shows before the first sync lands, or when the Worker can't be reached. */
export const emptySocial: SocialHistory = { accounts: [] }

function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

/** GET /api/social?days= — full follower history per connected account. Never throws. */
export async function fetchSocial(days = 90): Promise<SocialHistory> {
  if (!API_BASE || !API_KEY) return emptySocial

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(buildUrl(API_BASE, `/api/social?days=${days}`), {
      signal: controller.signal,
      headers: { 'x-api-key': API_KEY, ...authHeaders() },
    })
    if (res.status === 401) onUnauthorized()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as SocialHistory
    return Array.isArray(json?.accounts) ? json : emptySocial
  } catch (err) {
    console.warn('[socialData] fetch failed — no social data this load', err)
    return emptySocial
  } finally {
    clearTimeout(timer)
  }
}

/**
 * POST /api/social/refresh — ask the Worker to pull fresh numbers from the
 * platforms right now (rather than waiting for the daily cron). Returns whether
 * the Worker accepted the request; the caller should re-fetch afterwards.
 */
export async function refreshSocial(): Promise<boolean> {
  if (!API_BASE || !API_KEY) return false
  try {
    const res = await fetch(buildUrl(API_BASE, '/api/social/refresh'), {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, ...authHeaders() },
    })
    if (res.status === 401) onUnauthorized()
    return res.ok
  } catch (err) {
    console.warn('[socialData] refresh failed', err)
    return false
  }
}
