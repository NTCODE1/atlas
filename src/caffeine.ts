// --- Energy screen: caffeine tracking ---------------------------------------
//
// User-entered caffeine doses plus the decay math behind the Energy screen.
// Kept separate from data.ts (which holds bundled health fallbacks) because
// doses are user data — today they live in component state, but the shape here
// is a plain serializable CaffeineDose[] so they can later be swapped onto
// useLocalStorage or a backend without restructuring.

export interface CaffeineDose {
  id: string
  /** Drink name, e.g. "Flat white". */
  drink: string
  /** Time taken, "HH:MM" 24-hour. */
  time: string
  mg: number
}

export const caffeine = {
  /** Caffeine half-life in hours. */
  halfLifeHours: 5,
  /** Below this many mg, caffeine is unlikely to disrupt sleep (dashed line). */
  sleepThresholdMg: 50,
  /** Bedtime as "HH:MM" (dashed vertical line). */
  bedtime: '23:00',
  /** Chart x-axis domain. */
  dayStartHour: 6,
  dayEndHour: 24,
  /** Considered effectively cleared below this many mg. */
  clearThresholdMg: 10,
}

/** Common drinks for the quick-add buttons in the log form. */
export const CAFFEINE_PRESETS: { drink: string; mg: number }[] = [
  { drink: 'Espresso', mg: 120 },
  { drink: 'Coffee', mg: 95 },
  { drink: 'Tea', mg: 47 },
  { drink: 'Energy drink', mg: 80 },
]

/** Today's logged doses. Starts empty — the user logs their own. */
export const initialCaffeineDoses: CaffeineDose[] = []

/** "07:30" -> 7.5 decimal hours. */
export function timeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

/** 7.5 -> "07:30". Wraps past midnight (e.g. 25.5 -> "01:30"). */
export function hoursToTime(hours: number): string {
  const total = ((Math.round(hours * 60) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Total caffeine in the body at a given hour, summed across all doses taken
 * at or before that hour. Each dose decays as mg × 0.5^(hoursSince / halfLife).
 */
export function caffeineLevelAt(
  doses: CaffeineDose[],
  hour: number,
  halfLife = caffeine.halfLifeHours,
): number {
  return doses.reduce((sum, dose) => {
    const taken = timeToHours(dose.time)
    if (hour < taken) return sum
    return sum + dose.mg * Math.pow(0.5, (hour - taken) / halfLife)
  }, 0)
}

/**
 * Decimal hour at which total caffeine first drops below `clearThresholdMg`.
 * Solved forward from the last dose; can land after midnight (e.g. 26.2).
 */
export function caffeineClearsAt(
  doses: CaffeineDose[],
  halfLife = caffeine.halfLifeHours,
  threshold = caffeine.clearThresholdMg,
): number | null {
  if (doses.length === 0) return null
  const lastDose = Math.max(...doses.map((d) => timeToHours(d.time)))
  // Step forward from the last dose until the summed level falls below threshold.
  for (let hour = lastDose; hour <= lastDose + 48; hour += 0.25) {
    if (caffeineLevelAt(doses, hour, halfLife) < threshold) return hour
  }
  return null
}
