/**
 * Nutrition-gap client — sends today's intake-vs-targets nutrition object to the
 * atlas-api Worker, which prompts Claude for the largest gaps + whole-food fixes
 * and returns { gaps }.
 *
 * Targets aren't in KV (they live in data.ts/micros.ts) and micros are computed
 * client-side, so the app assembles the nutrition object and POSTs it. Mirrors
 * briefingAI.ts: reads env config, AbortController timeout, never throws → null.
 */

import type { TodaySnapshot } from '../hooks/useTodaySnapshot'

/** Same Worker as the health/nutrition APIs. */
import { authHeaders } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
/** Low-privilege read/AI key sent to the Worker (rate-limited server-side). */
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

const TIMEOUT_MS = 15000
/** Guard against a runaway response. */
const MAX_GAPS = 5

export interface NutritionGap {
  nutrient: string
  amountShort: string
  foodSuggestions: string[]
}

/** Join base URL + path without a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

/** Coerce one raw item into a valid NutritionGap, or null if unusable. */
function toGap(v: unknown): NutritionGap | null {
  if (v === null || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const nutrient = typeof o.nutrient === 'string' ? o.nutrient.trim() : ''
  const amountShort = typeof o.amountShort === 'string' ? o.amountShort.trim() : ''
  if (!nutrient) return null
  const foodSuggestions = Array.isArray(o.foodSuggestions)
    ? o.foodSuggestions.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    : []
  return { nutrient, amountShort, foodSuggestions }
}

/**
 * Get today's largest nutrition gaps. Returns the gaps (possibly empty), or
 * `null` on any failure (unset config, network, timeout, non-OK status, bad shape).
 */
export async function getNutritionGaps(
  nutrition: TodaySnapshot['nutrition'],
): Promise<NutritionGap[] | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[nutritionGapAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/nutrition-gap'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ nutrition }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { gaps?: unknown }
    if (!Array.isArray(json.gaps)) {
      console.warn('[nutritionGapAI] unexpected response shape', json)
      return null
    }
    return json.gaps
      .map(toGap)
      .filter((g): g is NutritionGap => g !== null)
      .slice(0, MAX_GAPS)
  } catch (err) {
    console.warn('[nutritionGapAI] request failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
