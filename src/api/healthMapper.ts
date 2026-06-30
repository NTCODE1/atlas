/**
 * Maps a raw Health Auto Export (HAE) payload into the flat, screen-friendly
 * shape the Atlas UI expects (see ../data.ts for the hard-coded equivalents).
 *
 * HAE posts JSON shaped like:
 *   {
 *     "data": {
 *       "metrics": [
 *         { "name": "heart_rate", "units": "bpm",
 *           "data": [ { "date": "...", "Avg": 62, "Min": 54, "Max": 130 } ] },
 *         { "name": "step_count", "units": "count",
 *           "data": [ { "date": "...", "qty": 8231 } ] },
 *         { "name": "sleep_analysis", "units": "hr",
 *           "data": [ { "date": "...", "totalSleep": 7.7, "inBed": 8.1,
 *                       "deep": 1.3, "core": 4.4, "rem": 1.8, "awake": 0.2 } ] },
 *         { "name": "active_energy", "units": "kJ",
 *           "data": [ { "date": "...", "qty": 1830 } ] },
 *         ...
 *       ]
 *     }
 *   }
 *
 * Field/unit notes for the real payload:
 * - heart_rate exposes aggregated Avg/Min/Max (capitalized) per point.
 * - sleep_analysis values are in HOURS, as named fields (totalSleep, inBed,
 *   deep, core, rem, awake) — not seconds, not a single qty.
 * - active_energy is in kJ (converted to kcal below).
 * - cumulative metrics (steps, caffeine, water) expose a `qty` total per point.
 *
 * Per-field fallback: HAE only sends the metrics you enable in the app, so any
 * metric that's absent maps to `null`. Calling code substitutes the hard-coded
 * data.ts value for just that field, rather than discarding the whole payload.
 */

/** One aggregated data point inside a metric. Fields vary by metric type. */
interface MetricDataPoint {
  date?: string
  /** Cumulative total for the period (steps, caffeine, water, energy, …). */
  qty?: number
  /** Aggregated average for instantaneous metrics (heart rate, HRV). */
  Avg?: number
  /** Aggregated minimum (e.g. lowest heart rate). */
  Min?: number
  /** Aggregated maximum. */
  Max?: number
  // --- sleep_analysis fields, all in hours ---
  totalSleep?: number
  inBed?: number
  deep?: number
  core?: number
  rem?: number
  awake?: number
  // --- sleep_analysis timestamps (HAE "yyyy-MM-dd HH:mm:ss +0000" or ISO) ---
  sleepStart?: string
  sleepEnd?: string
  inBedStart?: string
  inBedEnd?: string
}

interface Metric {
  name: string
  units?: string
  data?: MetricDataPoint[]
}

/** The mapped output consumed by Atlas screens. Every field is nullable so a
 *  missing metric falls back per-field to the hard-coded data.ts value. */
export interface HealthData {
  /** Resting HR (bpm) → Readiness + Sleep screens. From `resting_heart_rate` only. */
  restingHeartRate: number | null
  /** Average HR (bpm) → Sleep + Readiness screens. From `heart_rate` Avg. */
  averageHeartRate: number | null
  /** Heart-rate variability (ms) → Home tiles + Readiness screen. */
  hrv: number | null
  /** Total sleep, minutes → Home tile + Sleep screen. */
  sleepTotalMinutes: number | null
  /** Total sleep, whole-hours component (e.g. 7 of "7h 42m"). */
  sleepHours: number | null
  /** Total sleep, leftover-minutes component (e.g. 42 of "7h 42m"). */
  sleepMinutes: number | null
  /** Deep sleep, minutes → Sleep screen "Deep" stage tile. */
  sleepDeepMinutes: number | null
  /** REM sleep, minutes → Sleep screen "REM" stage tile. */
  sleepRemMinutes: number | null
  /** Awake time, minutes → Sleep screen "Awake" stage tile. */
  sleepAwakeMinutes: number | null
  /** Core sleep, minutes → Sleep screen (derived/remaining stage). */
  sleepCoreMinutes: number | null
  /** Fell-asleep clock time, local "HH:MM" → Sleep screen. */
  sleepStart: string | null
  /** Final-wake clock time, local "HH:MM" → Sleep screen. */
  sleepEnd: string | null
  /** Got-into-bed clock time, local "HH:MM" → Sleep screen BedtimeCard. */
  inBedStart: string | null
  /** Out-of-bed clock time, local "HH:MM" → Sleep screen BedtimeCard. */
  inBedEnd: string | null
  /** Step count → Home / future activity screen. */
  steps: number | null
  /** Caffeine (mg) → Energy screen caffeine value. */
  caffeineMg: number | null
  /** Active energy burned (kcal, converted from kJ) → Nutrition / Home. */
  activeEnergyKcal: number | null
  /** Hydration (litres) → Nutrition screen. */
  hydrationLitres: number | null
}

/** Health Auto Export reports active_energy in kJ; multiply to get kcal. */
const KJ_TO_KCAL = 0.239006

/** Empty/missing result: every field null. */
function emptyHealthData(): HealthData {
  return {
    restingHeartRate: null,
    averageHeartRate: null,
    hrv: null,
    sleepTotalMinutes: null,
    sleepHours: null,
    sleepMinutes: null,
    sleepDeepMinutes: null,
    sleepRemMinutes: null,
    sleepAwakeMinutes: null,
    sleepCoreMinutes: null,
    sleepStart: null,
    sleepEnd: null,
    inBedStart: null,
    inBedEnd: null,
    steps: null,
    caffeineMg: null,
    activeEnergyKcal: null,
    hydrationLitres: null,
  }
}

/** Find the metric with the given HAE name, or undefined if not present. */
function findMetric(metrics: Metric[], name: string): Metric | undefined {
  return metrics.find((m) => m?.name === name)
}

/** Non-empty data points for a metric, or null if the metric/points are absent. */
function points(metric: Metric | undefined): MetricDataPoint[] | null {
  if (!metric || !Array.isArray(metric.data) || metric.data.length === 0) return null
  return metric.data
}

/** Numeric values of a named field across a metric's points (empty array if none). */
function fieldValues(metric: Metric | undefined, field: keyof MetricDataPoint): number[] {
  const pts = points(metric)
  if (!pts) return []
  return pts.map((p) => p[field]).filter((v): v is number => typeof v === 'number')
}

/** Sum of `qty` across all points — for cumulative totals (steps, caffeine, …). */
function sumQty(metric: Metric | undefined): number | null {
  const values = fieldValues(metric, 'qty')
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0)
}

/** Average of `qty` across all points — for instantaneous metrics stored as qty (HRV, resting HR). */
function avgQty(metric: Metric | undefined): number | null {
  const values = fieldValues(metric, 'qty')
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0) / values.length
}

/** Average of a named aggregate field (e.g. "Avg") across points. */
function avgField(metric: Metric | undefined, field: 'Avg' | 'Min' | 'Max'): number | null {
  const values = fieldValues(metric, field)
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Sum a named sleep field (in hours) across points and convert to minutes, or
 * null if absent. Summing handles payloads that split sleep into segments.
 */
function sleepFieldMinutes(
  metric: Metric | undefined,
  field: 'totalSleep' | 'deep' | 'core' | 'rem' | 'awake',
): number | null {
  const values = fieldValues(metric, field)
  if (values.length === 0) return null
  const hours = values.reduce((sum, h) => sum + h, 0)
  return Math.round(hours * 60)
}

/**
 * Parse an HAE timestamp to a Date, or null. Accepts ISO and HAE's
 * "yyyy-MM-dd HH:mm:ss +0000" (space-separated, numeric offset) by normalizing
 * the space to `T` and the offset to `+00:00` on the fallback path.
 */
function parseHaeDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return direct
  const iso = raw.trim().replace(' ', 'T').replace(/\s*([+-]\d{2})(\d{2})$/, '$1:$2')
  const normalized = new Date(iso)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

/** Local "HH:MM" (device timezone) for a Date. */
function hhmmLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Earliest/latest timestamp of a named field across a sleep metric's points,
 * as local "HH:MM" — or null if absent/unparseable. `earliest` suits start
 * fields, `latest` suits end fields when HAE splits a night into segments.
 */
function sleepClock(
  metric: Metric | undefined,
  field: 'sleepStart' | 'sleepEnd' | 'inBedStart' | 'inBedEnd',
  pick: 'earliest' | 'latest',
): string | null {
  const pts = points(metric)
  if (!pts) return null
  const dates = pts.map((p) => parseHaeDate(p[field])).filter((d): d is Date => d !== null)
  if (dates.length === 0) return null
  const chosen = dates.reduce((a, b) =>
    pick === 'earliest'
      ? a.getTime() <= b.getTime()
        ? a
        : b
      : a.getTime() >= b.getTime()
        ? a
        : b,
  )
  return hhmmLocal(chosen)
}

export function mapHealthData(payload: unknown): HealthData {
  const metrics = (payload as { data?: { metrics?: unknown } } | null | undefined)?.data?.metrics
  if (!Array.isArray(metrics)) return emptyHealthData()

  const list = metrics as Metric[]

  // heart_rate → average HR (Avg) for Sleep/Readiness. (Capitalized Avg/Min/Max.)
  const averageHeartRate = avgField(findMetric(list, 'heart_rate'), 'Avg')

  // resting_heart_rate → resting HR for Readiness/Sleep. Null until this metric is
  // enabled in the automation — intentionally NOT derived from heart_rate Min.
  const restingHeartRate = avgQty(findMetric(list, 'resting_heart_rate'))

  // heart_rate_variability → HRV (ms) for Home tiles + Readiness. Null until added.
  const hrv = avgQty(findMetric(list, 'heart_rate_variability'))

  // sleep_analysis → durations in hours → minutes. totalSleep drives the Home/Sleep
  // duration display; deep/rem/awake/core feed the Sleep screen stage tiles.
  const sleepMetric = findMetric(list, 'sleep_analysis')
  const sleepTotalMinutes = sleepFieldMinutes(sleepMetric, 'totalSleep')
  const sleepHours = sleepTotalMinutes === null ? null : Math.floor(sleepTotalMinutes / 60)
  const sleepMinutes = sleepTotalMinutes === null ? null : sleepTotalMinutes % 60
  const sleepDeepMinutes = sleepFieldMinutes(sleepMetric, 'deep')
  const sleepRemMinutes = sleepFieldMinutes(sleepMetric, 'rem')
  const sleepAwakeMinutes = sleepFieldMinutes(sleepMetric, 'awake')
  const sleepCoreMinutes = sleepFieldMinutes(sleepMetric, 'core')

  // sleep_analysis timestamps → local "HH:MM" clock times for the Sleep screen.
  const sleepStart = sleepClock(sleepMetric, 'sleepStart', 'earliest')
  const sleepEnd = sleepClock(sleepMetric, 'sleepEnd', 'latest')
  const inBedStart = sleepClock(sleepMetric, 'inBedStart', 'earliest')
  const inBedEnd = sleepClock(sleepMetric, 'inBedEnd', 'latest')

  // step_count → steps for Home / future activity screen (cumulative qty).
  const steps = sumQty(findMetric(list, 'step_count'))

  // dietary_caffeine → total mg for the Energy screen (cumulative). Null until added.
  const caffeineMg = sumQty(findMetric(list, 'dietary_caffeine'))

  // active_energy → kJ; convert to kcal for Nutrition / Home (cumulative qty).
  const activeEnergyKj = sumQty(findMetric(list, 'active_energy'))
  const activeEnergyKcal = activeEnergyKj === null ? null : Math.round(activeEnergyKj * KJ_TO_KCAL)

  // dietary_water → hydration litres for Nutrition (cumulative). Null until added.
  const hydrationLitres = sumQty(findMetric(list, 'dietary_water'))

  return {
    restingHeartRate,
    averageHeartRate,
    hrv,
    sleepTotalMinutes,
    sleepHours,
    sleepMinutes,
    sleepDeepMinutes,
    sleepRemMinutes,
    sleepAwakeMinutes,
    sleepCoreMinutes,
    sleepStart,
    sleepEnd,
    inBedStart,
    inBedEnd,
    steps,
    caffeineMg,
    activeEnergyKcal,
    hydrationLitres,
  }
}
