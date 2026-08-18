/**
 * Calendar-parse client — asks the atlas-api Worker to extract calendar
 * events/tasks from free text (the Worker proxies Anthropic Claude; the key never
 * reaches the browser).
 *
 * Mirrors nutritionAI.ts: reads env config, uses an AbortController timeout, and
 * never throws — any failure resolves to `null` so the caller can fall back to a
 * normal chat reply.
 */

/** Same Worker as the health/nutrition APIs. */
import { authHeaders } from '../auth/session'

const API_BASE = import.meta.env.VITE_HEALTH_API_URL as string | undefined
/** Low-privilege read/AI key sent to the Worker (rate-limited server-side). */
const API_KEY = import.meta.env.VITE_ATLAS_API_KEY as string | undefined

const TIMEOUT_MS = 12000
/** Guard against a runaway model response. */
const MAX_EVENTS = 25

export interface ParsedEvent {
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM 24-hour */
  time: string
  type: 'event' | 'task'
}

/** Join base URL + path without a double slash. */
function buildUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}

/** Coerce one raw item into a valid ParsedEvent, or null if unusable. */
export function toParsedEvent(v: unknown): ParsedEvent | null {
  if (v === null || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const date = typeof o.date === 'string' ? o.date.trim() : ''
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const rawTime = typeof o.time === 'string' ? o.time.trim() : ''
  const time = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : '09:00'
  const type = o.type === 'task' ? 'task' : 'event'
  return { title, date, time, type }
}

/**
 * Parse free text into calendar events. `today` is the caller's local YYYY-MM-DD
 * so weekday phrases resolve in the user's timezone. Returns the events (possibly
 * empty), or `null` on any failure (unset config, network, timeout, bad shape).
 */
export async function parseCalendar(text: string, today: string): Promise<ParsedEvent[] | null> {
  if (!API_BASE || !API_KEY) {
    console.warn('[calendarAI] VITE_HEALTH_API_URL or VITE_ATLAS_API_KEY not set — skipping parse')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(buildUrl(API_BASE, '/api/calendar-parse'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...authHeaders() },
      body: JSON.stringify({ text, today }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as unknown
    if (!Array.isArray(json)) {
      console.warn('[calendarAI] expected an array', json)
      return null
    }
    return json
      .map(toParsedEvent)
      .filter((e): e is ParsedEvent => e !== null)
      .slice(0, MAX_EVENTS)
  } catch (err) {
    console.warn('[calendarAI] parse failed', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}
