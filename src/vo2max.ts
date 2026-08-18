import type { Sex } from './settings'
import type { MetricPoint } from './api/healthMapper'

export interface Vo2MaxEntry {
  /** YYYY-MM-DD — one entry per date, later logs overwrite. */
  date: string
  /** ml/kg/min */
  value: number
}

export const sortEntries = (entries: Vo2MaxEntry[]): Vo2MaxEntry[] =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date))

export const latestEntry = (entries: Vo2MaxEntry[]): Vo2MaxEntry | undefined =>
  sortEntries(entries)[entries.length - 1]

/**
 * Combine Apple Health's VO2 max history (never populated for a COROS-only
 * setup, since COROS has no way to write it back — but kept so this self-heals
 * if that ever changes) with the manually logged entries into one series, oldest
 * first. Live wins on a date both report, since it's the higher-fidelity source.
 */
export function mergeVo2MaxSeries(live: MetricPoint[], manual: Vo2MaxEntry[]): MetricPoint[] {
  const byDate = new Map<string, number>()
  for (const e of manual) byDate.set(e.date, e.value)
  for (const p of live) byDate.set(p.t, p.v)
  return [...byDate.entries()].map(([t, v]) => ({ t, v })).sort((a, b) => a.t.localeCompare(b.t))
}

export type FitnessCategory = 'poor' | 'fair' | 'good' | 'excellent' | 'superior'

export const FITNESS_CATEGORY_LABEL: Record<FitnessCategory, string> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
  superior: 'Superior',
}

/** Upper bound (ml/kg/min) of each tier below "superior", for one age band. */
interface AgeBand {
  /** Inclusive upper age bound for this band. */
  maxAge: number
  poor: number
  fair: number
  good: number
  excellent: number
}

/**
 * Standard cardio-fitness (VO2 max) norms by age and sex — the same style of
 * age/sex-adjusted table sports watches (Garmin, COROS, Apple) rate cardio
 * fitness against. Exact vendor thresholds are proprietary, so these are a
 * widely published approximation (Cooper Institute / Firstbeat-derived norms),
 * good enough to place a reading in the right tier.
 */
const MALE_BANDS: AgeBand[] = [
  { maxAge: 24, poor: 35, fair: 42, good: 52, excellent: 59 },
  { maxAge: 29, poor: 34, fair: 40, good: 50, excellent: 56 },
  { maxAge: 34, poor: 33, fair: 39, good: 48, excellent: 54 },
  { maxAge: 39, poor: 31, fair: 37, good: 46, excellent: 52 },
  { maxAge: 44, poor: 30, fair: 35, good: 44, excellent: 49 },
  { maxAge: 49, poor: 28, fair: 33, good: 42, excellent: 47 },
  { maxAge: 54, poor: 25, fair: 31, good: 40, excellent: 45 },
  { maxAge: 59, poor: 24, fair: 29, good: 37, excellent: 42 },
  { maxAge: Infinity, poor: 22, fair: 26, good: 35, excellent: 40 },
]

const FEMALE_BANDS: AgeBand[] = [
  { maxAge: 24, poor: 27, fair: 32, good: 43, excellent: 50 },
  { maxAge: 29, poor: 26, fair: 31, good: 42, excellent: 49 },
  { maxAge: 34, poor: 25, fair: 29, good: 39, excellent: 46 },
  { maxAge: 39, poor: 24, fair: 27, good: 36, excellent: 43 },
  { maxAge: 44, poor: 22, fair: 26, good: 35, excellent: 40 },
  { maxAge: 49, poor: 21, fair: 24, good: 32, excellent: 38 },
  { maxAge: 54, poor: 19, fair: 22, good: 30, excellent: 35 },
  { maxAge: 59, poor: 18, fair: 20, good: 27, excellent: 33 },
  { maxAge: Infinity, poor: 16, fair: 18, good: 25, excellent: 31 },
]

function bandFor(age: number, sex: Sex): AgeBand {
  const bands = sex === 'male' ? MALE_BANDS : FEMALE_BANDS
  return bands.find((b) => age <= b.maxAge) ?? bands[bands.length - 1]
}

/** Which fitness tier a VO2 max reading falls into for this age/sex. */
export function vo2MaxCategory(value: number, age: number, sex: Sex): FitnessCategory {
  const b = bandFor(age, sex)
  if (value < b.poor) return 'poor'
  if (value < b.fair) return 'fair'
  if (value < b.good) return 'good'
  if (value < b.excellent) return 'excellent'
  return 'superior'
}

/**
 * 0–100 position for the ring gauge: each of the 5 tiers gets an equal 20%
 * band, with the reading placed linearly within its tier's band. "Superior"
 * has no upper bound, so it's given the same width as "Excellent" and clamped
 * there — a highest-tier reading always reads as visually "full-ish", not
 * unboundedly far past the ring.
 */
export function vo2MaxGaugePercent(value: number, age: number, sex: Sex): number {
  const b = bandFor(age, sex)
  const topSpan = Math.max(b.excellent - b.good, 1)
  const v = Math.max(0, Math.min(value, b.excellent + topSpan))

  if (v < b.poor) return (v / b.poor) * 20
  if (v < b.fair) return 20 + ((v - b.poor) / (b.fair - b.poor)) * 20
  if (v < b.good) return 40 + ((v - b.fair) / (b.good - b.fair)) * 20
  if (v < b.excellent) return 60 + ((v - b.good) / (b.excellent - b.good)) * 20
  return 80 + ((v - b.excellent) / topSpan) * 20
}
