import type { IconId } from './icons'

export interface HabitDef {
  id: string
  name: string
  icon: IconId
  preset?: boolean
}

/**
 * A check means "kept the goal today" — for avoid-habits (smoking, junk food)
 * that reads as "stayed clean today". Stored as date → checked habit ids.
 */
export type HabitChecks = Record<string, string[]>

export const HABIT_PRESETS: HabitDef[] = [
  { id: 'smoking', name: 'No smoking', icon: 'smoking', preset: true },
  { id: 'alcohol', name: 'No alcohol', icon: 'wine', preset: true },
  { id: 'caffeine', name: 'Caffeine limit', icon: 'coffee', preset: true },
  { id: 'social-media', name: 'Less social media', icon: 'phone-free', preset: true },
  { id: 'junk-food', name: 'No junk food', icon: 'junk-food', preset: true },
  { id: 'exercise', name: 'Exercise', icon: 'strength', preset: true },
  { id: 'reading', name: 'Reading', icon: 'read', preset: true },
  { id: 'meditation', name: 'Meditation', icon: 'mind', preset: true },
]

export const dateISO = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isChecked = (checks: HabitChecks, habitId: string, iso: string): boolean =>
  checks[iso]?.includes(habitId) ?? false

/**
 * Consecutive checked days ending today — or yesterday, so an unbroken run
 * isn't shown as 0 before today's check-in.
 */
export function streak(checks: HabitChecks, habitId: string, today = new Date()): number {
  const day = new Date(today)
  if (!isChecked(checks, habitId, dateISO(day))) {
    day.setDate(day.getDate() - 1)
    if (!isChecked(checks, habitId, dateISO(day))) return 0
  }
  let count = 0
  while (isChecked(checks, habitId, dateISO(day))) {
    count++
    day.setDate(day.getDate() - 1)
  }
  return count
}

/** Longest run of consecutive checked days on record. */
export function bestStreak(checks: HabitChecks, habitId: string): number {
  const days = Object.keys(checks)
    .filter((iso) => checks[iso].includes(habitId))
    .sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const iso of days) {
    const d = new Date(`${iso}T00:00:00`)
    run = prev !== null && d.getTime() - prev.getTime() === 86_400_000 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Oldest-first checked flags for the last `n` days, ending today. */
export function lastDays(
  checks: HabitChecks,
  habitId: string,
  n = 30,
  today = new Date(),
): boolean[] {
  const out: boolean[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(isChecked(checks, habitId, dateISO(d)))
  }
  return out
}
