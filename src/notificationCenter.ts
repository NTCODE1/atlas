/**
 * In-app notification center — the alert engine. Pure logic, no React and no
 * browser Notification API: these alerts surface inside the app (the header
 * bell dropdown) while it's open. Distinct from src/notifications.ts, which
 * fires OS notifications gated on permission.
 */
import { dateISO, streak, type HabitChecks, type HabitDef } from './habits'
import { readJournalDay } from './hooks/useJournalMonth'

export type AlertKind = 'event' | 'sleep' | 'habit'

export interface Alert {
  /** Stable per-day id — also the dedupe key for dismissed/seen state. */
  id: string
  kind: AlertKind
  title: string
  body: string
}

/**
 * Important journal/calendar entries for today, surfaced on app open. Reuses
 * the journal's `important` flag (there is no separate calendar store).
 */
export function buildEventAlerts(today = new Date()): Alert[] {
  const { record, dateISO: iso } = readJournalDay(today)
  if (!record) return []
  return record.entries
    .filter((entry) => entry.important)
    .map((entry) => ({
      id: `event-${iso}-${entry.id}`,
      kind: 'event' as const,
      title: 'Important today',
      body: `${entry.time} — ${entry.text.slice(0, 80)}`,
    }))
}

/** Low sleep score. Non-null only when the live score is under the threshold. */
export function buildSleepAlert(score: number, threshold: number, today = new Date()): Alert | null {
  if (score >= threshold) return null
  return {
    id: `sleep-${dateISO(today)}`,
    kind: 'sleep',
    title: 'Low sleep score',
    body: `Last night scored ${score}. Favour recovery today.`,
  }
}

/**
 * Habits with a live streak that hasn't been logged today — the streak breaks
 * if it isn't kept before day's end. `streak()` counts the run ending today or
 * yesterday, so a run kept through yesterday still reports >= 1.
 */
export function buildHabitAlerts(
  defs: HabitDef[],
  checks: HabitChecks,
  today = new Date(),
): Alert[] {
  const iso = dateISO(today)
  return defs
    .filter((def) => {
      const doneToday = checks[iso]?.includes(def.id) ?? false
      return !doneToday && streak(checks, def.id, today) >= 1
    })
    .map((def) => {
      const n = streak(checks, def.id, today)
      return {
        id: `habit-${iso}-${def.id}`,
        kind: 'habit' as const,
        title: 'Streak at risk',
        body: `${def.name} — ${n}-day streak breaks if not logged today.`,
      }
    })
}

/** Per-day dismiss log: alert id → the ISO date it was dismissed on. */
export type DismissLog = Record<string, string>

const DISMISS_MAX_AGE_DAYS = 2

export function isDismissed(log: DismissLog, id: string, iso: string): boolean {
  return log[id] === iso
}

/** Return a new log with `id` marked dismissed today, pruning stale entries. */
export function dismiss(log: DismissLog, id: string, iso = dateISO()): DismissLog {
  return { ...pruneLog(log, iso), [id]: iso }
}

/** Drop entries older than the retention window so the log can't grow forever. */
export function pruneLog(log: DismissLog, iso = dateISO()): DismissLog {
  const cutoff = new Date(`${iso}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - DISMISS_MAX_AGE_DAYS)
  const out: DismissLog = {}
  for (const [id, day] of Object.entries(log)) {
    if (new Date(`${day}T00:00:00`) >= cutoff) out[id] = day
  }
  return out
}
