// --- 7-day retention for short, day-scoped logs ------------------------------
//
// Meals and hydration drinks are passively-collected daily logs — nothing
// reads more than about a week of them (HydrationAverageCard's "current week"
// view is the deepest lookback), so entries older than RAW_RETENTION_DAYS are
// dropped outright. This deliberately does NOT apply to user-created content
// (weight log, workouts, journal/calendar entries, goal history, assistant
// chat) — those are things the user made and would want to keep, not raw
// sensor data. See dailySnapshot.ts for the analogous policy on the daily
// health snapshot (which keeps a slim baseline-only rollup past 7 days).

import { RAW_RETENTION_DAYS, cutoffDateISO } from './dailySnapshot'

export { RAW_RETENTION_DAYS }

/**
 * Drop entries dated before RAW_RETENTION_DAYS ago. `date` is optional in the
 * constraint because some item types (e.g. Meal) allow it to be absent on
 * legacy/seed entries — those are kept as-is since there's no date to judge
 * their age by. Returns the same array reference when nothing was pruned, so
 * callers can skip a no-op write.
 */
export function pruneByDate<T extends { date?: string }>(items: T[], today: string): T[] {
  const cutoff = cutoffDateISO(today, RAW_RETENTION_DAYS)
  const pruned = items.filter((i) => i.date == null || i.date >= cutoff)
  return pruned.length === items.length ? items : pruned
}
