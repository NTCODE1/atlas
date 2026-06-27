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
