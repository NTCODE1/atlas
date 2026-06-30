/**
 * Health data fetcher for the Atlas PWA.
 *
 * Reads real health data from the atlas-api Cloudflare Worker, but always
 * degrades gracefully to the hard-coded data in `../data` if the API is
 * unset, unreachable, slow (>3s), or returns nothing. The dashboard must
 * never render blank, so these functions never throw and never resolve to an
 * empty payload — failures are logged with console.warn only.
 */

import * as data from '../data'

/** Loose shape: the API payload (from Health Auto Export) is arbitrary JSON. */
export type HealthData = Record<string, unknown>

/** Configurable Worker base URL, e.g. https://atlas-api.yourname.workers.dev */
const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined

/** How long to wait for the API before giving up and using bundled data. */
const TIMEOUT_MS = 3000

/**
 * The hard-coded screen data, bundled as the fallback payload. Values only —
 * the helper functions in `../data` are intentionally excluded.
 */
export const fallbackHealthData: HealthData = {
  readiness: data.readiness,
  stats: data.stats,
  sleep: data.sleep,
  sleepStages: data.sleepStages,
  sleepBalance: data.sleepBalance,
  nutrition: data.nutrition,
  meals: data.meals,
  micronutrients: data.micronutrients,
  training: data.training,
  upNext: data.upNext,
  todaysTarget: data.todaysTarget,
  hydration: data.hydration,
  mood: data.mood,
  deepWork: data.deepWork,
  focus: data.focus,
}

/** True for anything that shouldn't replace real screen data: non-objects and empty objects/arrays. */
function isEmpty(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  if (Array.isArray(value)) return value.length === 0
  return Object.keys(value).length === 0
}

/** Join the base URL and a path without producing a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

/**
 * Fetch JSON from the API at `path`, falling back to bundled data on any
 * failure, timeout, or empty response. Never throws.
 */
async function getJson(path: string): Promise<HealthData> {
  if (!API_BASE) {
    console.warn('[healthData] VITE_HEALTH_API_URL is not set — falling back to bundled data')
    return fallbackHealthData
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, path), { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const json = (await res.json()) as unknown
    if (isEmpty(json)) {
      console.warn(`[healthData] ${path} returned no data — falling back to bundled data`)
      return fallbackHealthData
    }
    return json as HealthData
  } catch (err) {
    console.warn(`[healthData] ${path} failed — falling back to bundled data`, err)
    return fallbackHealthData
  } finally {
    clearTimeout(timer)
  }
}

/** GET /api/health — the latest stored health payload. */
export function fetchHealthData(): Promise<HealthData> {
  return getJson('/api/health')
}

/** GET /api/health/:date — the payload for a specific YYYY-MM-DD. */
export function fetchHealthDataForDate(date: string): Promise<HealthData> {
  return getJson(`/api/health/${encodeURIComponent(date)}`)
}
