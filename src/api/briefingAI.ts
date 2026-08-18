/**
 * Daily briefing client — sends today's assembled metrics to the atlas-api
 * Worker, which prompts Claude for a terse coach brief and returns { brief }.
 *
 * The metrics can't be read server-side (caffeine/hydration/training/meals live
 * only in the browser, and readiness/sleep are computed client-side), so the app
 * assembles them and POSTs them here. Mirrors assistantAI.ts: reads env config,
 * uses an AbortController timeout, and never throws — failures resolve to `null`.
 */

/** Same Worker as the health/nutrition/chat APIs. */
import { authHeaders } from '../auth/session'
import type { TodaySnapshot } from '../hooks/useTodaySnapshot'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
/** Low-privilege read/AI key sent to the Worker (rate-limited server-side). */
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

/** LLM call — allow headroom. */
const TIMEOUT_MS = 15000

export interface BriefingMetrics {
  readiness: number
  sleepScore: number
  hrv: number
  restingHr: number | null
  caffeineMg: number
  hydration: { litres: number; goalL: number }
  training: { todayLoadKg: number; loggedToday: boolean }
  macros: { kcal: number; protein: number; carbs: number; fat: number }
  macroTargets: { kcal: number; protein: number; carbs: number; fat: number }
  /** Today's micronutrient totals (meals + supplements) vs recommended daily amount. */
  micros: { name: string; amount: number; target: number; unit: string; pctRda: number }[]
  /** Last 7 days before today, most-recent-first — lets the brief reference trends, not just today. */
  recentDays: TodaySnapshot['recentDays']
}

/** Join base URL + path without a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

/**
 * Get today's coach brief. Returns the brief string, or `null` on any failure
 * (unset config, network, timeout, non-OK status, bad shape) so the card can
 * degrade gracefully.
 */
export async function getBriefing(metrics: BriefingMetrics): Promise<string | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[briefingAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping briefing')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/briefing'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ metrics }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { brief?: unknown }
    if (typeof json.brief !== 'string' || json.brief.trim() === '') {
      console.warn('[briefingAI] unexpected response shape', json)
      return null
    }
    return json.brief
  } catch (err) {
    console.warn('[briefingAI] briefing failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
