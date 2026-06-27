/**
 * Hard-coded fake data for the Atlas Home screen.
 * This stands in for real integrations — everything the UI renders comes from here.
 */

export const user = {
  greeting: 'Good morning',
  name: 'Niila',
}

/** Live current date formatted like "Thursday · 27 June". */
export function formatToday(date = new Date()): string {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  const day = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'long' })
  return `${weekday} · ${day} ${month}`
}

export const readiness = {
  score: 78,
  label: 'PRIMED',
  verdict: 'HRV up, well slept, caffeine clear — a good day to push the hard session.',
}

export interface Stat {
  label: string
  value: string
  unit: string
  /** Optional second value+unit pair, e.g. 7h 42m. */
  value2?: string
  unit2?: string
  /** Mint trend chip, e.g. "12%" or "6". */
  trend?: string
  trendDir?: 'up' | 'down'
  /** Plain sub-label instead of a trend, e.g. "clear". */
  sub?: string
  /** Mini sparkline points (relative magnitudes). */
  spark: number[]
}

export const stats: Stat[] = [
  {
    label: 'SLEEP',
    value: '7',
    unit: 'h',
    value2: '42',
    unit2: 'm',
    trend: '12%',
    trendDir: 'up',
    spark: [5, 6, 4, 7, 6, 8, 7],
  },
  {
    label: 'HRV',
    value: '68',
    unit: 'ms',
    trend: '6',
    trendDir: 'up',
    spark: [4, 5, 4, 6, 5, 7, 8],
  },
  {
    label: 'CAFFEINE',
    value: '0',
    unit: 'mg',
    sub: 'clear',
    spark: [8, 7, 6, 4, 3, 1, 0],
  },
]

export const focus = {
  title: 'Zone-2 Run · 45 min',
  tag: 'From training plan',
}

export const deepWork = {
  value: '3',
  unit: 'h',
  value2: '15',
  unit2: 'm',
  goal: 'of 4h goal',
  /** 0–1 completion. */
  progress: 0.81,
}

export const hydration = {
  value: '1.6',
  unit: 'L',
  goal: 'of 2.5 L goal',
  filled: 5,
  total: 6,
}

export const mood = {
  label: 'CURRENT MOOD',
  value: 'Focused',
}

// --- Energy screen: caffeine tracking ---------------------------------------

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
  clearThresholdMg: 1,
}

/** Hard-coded fake doses for today — a morning peak plus an afternoon top-up. */
export const caffeineDoses: CaffeineDose[] = [
  { id: 'd1', drink: 'Flat white', time: '07:30', mg: 130 },
  { id: 'd2', drink: 'Espresso', time: '10:00', mg: 75 },
  { id: 'd3', drink: 'Green tea', time: '13:30', mg: 35 },
  { id: 'd4', drink: 'Pre-workout', time: '16:00', mg: 150 },
]

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
