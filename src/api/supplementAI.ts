/**
 * Supplement AI client — asks the atlas-api Worker to estimate the
 * micronutrient content of a supplement at a given dose (Worker proxies Claude;
 * the key never reaches the browser).
 *
 * Mirrors nutritionAI.ts: env-configured base URL, AbortController timeout,
 * never throws — any failure resolves to `null` so the supplement can still be
 * logged without micros.
 */
import type { MicroAmounts } from '../micros'

import { authHeaders } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined
const TIMEOUT_MS = 12000

export interface ParsedSupplement {
  micros: MicroAmounts
  confidence: 'low' | 'medium' | 'high'
}

function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

function isParsedSupplement(v: unknown): v is ParsedSupplement {
  return v !== null && typeof v === 'object' && typeof (v as { micros?: unknown }).micros === 'object'
}

/** Round the LLM's micro estimates to 1 decimal, matching parseMeal's rounding. */
function roundParsedSupplement(supplement: ParsedSupplement): ParsedSupplement {
  return {
    ...supplement,
    micros: Object.fromEntries(
      Object.entries(supplement.micros).map(([key, amount]) => [key, Math.round(amount * 10) / 10]),
    ) as MicroAmounts,
  }
}

/**
 * Estimate a supplement's micronutrients. Returns `null` on any failure so the
 * caller can still log the supplement without micros.
 */
export async function parseSupplement(name: string, dosage: string): Promise<ParsedSupplement | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[supplementAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping AI parse')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/ai/supplement'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ name, dosage }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as unknown
    if (!isParsedSupplement(json)) {
      console.warn('[supplementAI] unexpected response shape — skipping micros', json)
      return null
    }
    return roundParsedSupplement(json)
  } catch (err) {
    console.warn('[supplementAI] parse failed — logging supplement without micros', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
