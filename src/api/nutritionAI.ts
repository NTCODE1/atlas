/**
 * Nutrition AI client — asks the atlas-api Worker to estimate calories/macros
 * for a free-text meal description (the Worker proxies Anthropic Claude; the key
 * never reaches the browser).
 *
 * Mirrors healthData.ts conventions: reads the Worker base URL from env, uses
 * an AbortController timeout, and never throws — any failure resolves to `null`
 * so the caller can still log the meal without macros.
 */

import type { MicroAmounts } from '../micros'

/** Same Worker as the health API. */
import { authHeaders } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
/** Low-privilege read/AI key sent to the Worker (rate-limited server-side). */
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

/** LLM calls are slower than the health path — allow more headroom. */
const TIMEOUT_MS = 12000

export interface ParsedMealItem {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface ParsedMeal {
  totalKcal: number
  protein: number
  carbs: number
  fat: number
  micros?: MicroAmounts
  items: ParsedMealItem[]
  confidence: 'low' | 'medium' | 'high'
}

/** Join base URL + path without a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

function isParsedMeal(v: unknown): v is ParsedMeal {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.totalKcal === 'number' &&
    typeof o.protein === 'number' &&
    typeof o.carbs === 'number' &&
    typeof o.fat === 'number'
  )
}

/** Round the LLM's macro/micro estimates to whole numbers (micros to 1 decimal), matching the assistant-chat log_meal path. */
function roundParsedMeal(meal: ParsedMeal): ParsedMeal {
  return {
    ...meal,
    totalKcal: Math.round(meal.totalKcal),
    protein: Math.round(meal.protein),
    carbs: Math.round(meal.carbs),
    fat: Math.round(meal.fat),
    micros: meal.micros
      ? (Object.fromEntries(
          Object.entries(meal.micros).map(([key, amount]) => [key, Math.round(amount * 10) / 10]),
        ) as MicroAmounts)
      : meal.micros,
  }
}

/**
 * Estimate calories/macros for a meal description. Returns `null` on any
 * failure (unset config, network, timeout, non-OK status, bad shape) so meal
 * logging degrades gracefully.
 */
export async function parseMeal(text: string): Promise<ParsedMeal | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[nutritionAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping AI parse')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/ai/nutrition'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as unknown
    if (!isParsedMeal(json)) {
      console.warn('[nutritionAI] unexpected response shape — skipping macros', json)
      return null
    }
    return roundParsedMeal(json)
  } catch (err) {
    console.warn('[nutritionAI] parse failed — logging meal without macros', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
