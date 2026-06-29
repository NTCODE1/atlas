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
 *         ...
 *       ]
 *     }
 *   }
 *
 * Each metric carries an array of aggregated data points. Instantaneous metrics
 * (heart rate, HRV) expose Avg/Min/Max per point; cumulative metrics (steps,
 * caffeine, water, energy) expose a `qty` total per point.
 *
 * Per-field fallback: HAE only sends the metrics you enable in the app, so any
 * metric that's absent maps to `null`. Calling code should substitute the
 * hard-coded data.ts value for just that field, rather than discarding the
 * whole payload.
 */

/** One aggregated data point inside a metric. Fields vary by metric type. */
interface MetricDataPoint {
  date?: string
  /** Cumulative total for the period (steps, caffeine, water, energy, …). */
  qty?: number
  /** Aggregated average for instantaneous metrics (heart rate, HRV). */
  Avg?: number
  /** Aggregated minimum (e.g. lowest heart rate ≈ resting). */
  Min?: number
  /** Aggregated maximum. */
  Max?: number
  /** Some sleep payloads expose these (in hours) instead of a qty. */
  asleep?: number
  totalSleep?: number
}

interface Metric {
  name: string
  units?: string
  data?: MetricDataPoint[]
}

/** The mapped output consumed by Atlas screens. Every field is nullable so a
 *  missing metric falls back per-field to the hard-coded data.ts value. */
export interface HealthData {
  /** Resting HR (bpm) → Readiness + Sleep screens. */
  restingHeartRate: number | null
  /** Average HR (bpm) → Sleep + Readiness screens. */
  averageHeartRate: number | null
  /** Heart-rate variability (ms) → Home tiles + Readiness screen. */
  hrv: number | null
  /** Total sleep, minutes → Home tile + Sleep screen. */
  sleepTotalMinutes: number | null
  /** Total sleep, whole-hours component (e.g. 7 of "7h 42m"). */
  sleepHours: number | null
  /** Total sleep, leftover-minutes component (e.g. 42 of "7h 42m"). */
  sleepMinutes: number | null
  /** Step count → Home / future activity screen. */
  steps: number | null
  /** Caffeine (mg) → Energy screen caffeine value. */
  caffeineMg: number | null
  /** Active energy burned (kcal) → Nutrition / Home. */
  activeEnergyKcal: number | null
  /** Hydration (litres) → Nutrition screen. */
  hydrationLitres: number | null
}

/**
 * Sleep unit divisor. The request specifies HAE sends total sleep in **seconds**,
 * so we divide by 60 to reach minutes. NOTE: many HAE configurations report
 * sleep in **hours** (via `asleep` / `totalSleep`) instead — if your mapped
 * sleep looks wildly wrong, change this to map hours→minutes (`* 60`) and read
 * the `asleep` field below instead of `qty`.
 */
const SLEEP_SECONDS_PER_MINUTE = 60

/** Empty/missing result: every field null. */
function emptyHealthData(): HealthData {
  return {
    restingHeartRate: null,
    averageHeartRate: null,
    hrv: null,
    sleepTotalMinutes: null,
    sleepHours: null,
    sleepMinutes: null,
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

/** Sum of `qty` across all points — for cumulative totals (steps, caffeine, …). */
function sumQty(metric: Metric | undefined): number | null {
  const pts = points(metric)
  if (!pts) return null
  const values = pts.map((p) => p.qty).filter((q): q is number => typeof q === 'number')
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0)
}

/** Average of `qty` across all points — for instantaneous metrics stored as qty (HRV). */
function avgQty(metric: Metric | undefined): number | null {
  const pts = points(metric)
  if (!pts) return null
  const values = pts.map((p) => p.qty).filter((q): q is number => typeof q === 'number')
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0) / values.length
}

/** Average of a named aggregate field (e.g. "Avg") across points. */
function avgField(metric: Metric | undefined, field: 'Avg' | 'Min' | 'Max'): number | null {
  const pts = points(metric)
  if (!pts) return null
  const values = pts.map((p) => p[field]).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Minimum of a named aggregate field across points (e.g. lowest "Min" HR ≈ resting). */
function minField(metric: Metric | undefined, field: 'Avg' | 'Min' | 'Max'): number | null {
  const pts = points(metric)
  if (!pts) return null
  const values = pts.map((p) => p[field]).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return null
  return Math.min(...values)
}

/** Total sleep in seconds, summed from each point's `qty` (per the HAE seconds assumption). */
function sleepSeconds(metric: Metric | undefined): number | null {
  // Adjust here if your HAE payload reports sleep in hours via `asleep`/`totalSleep`
  // (e.g. `p.asleep * 3600`) — see SLEEP_SECONDS_PER_MINUTE note above.
  return sumQty(metric)
}

export function mapHealthData(payload: unknown): HealthData {
  const metrics = (payload as { data?: { metrics?: unknown } } | null | undefined)?.data?.metrics
  if (!Array.isArray(metrics)) return emptyHealthData()

  const list = metrics as Metric[]

  // heart_rate → average (Avg) for Sleep/Readiness; its Min approximates resting HR.
  const heartRate = findMetric(list, 'heart_rate')
  const averageHeartRate = avgField(heartRate, 'Avg')

  // resting_heart_rate → resting HR for Readiness; preferred over heart_rate Min.
  const restingMetric = findMetric(list, 'resting_heart_rate')
  const restingHeartRate = avgQty(restingMetric) ?? minField(heartRate, 'Min')

  // heart_rate_variability → HRV (ms) for Home tiles + Readiness.
  const hrv = avgQty(findMetric(list, 'heart_rate_variability'))

  // sleep_analysis → total sleep duration; seconds → hours + minutes.
  const sleepSecs = sleepSeconds(findMetric(list, 'sleep_analysis'))
  const sleepTotalMinutes = sleepSecs === null ? null : Math.round(sleepSecs / SLEEP_SECONDS_PER_MINUTE)
  const sleepHours = sleepTotalMinutes === null ? null : Math.floor(sleepTotalMinutes / 60)
  const sleepMinutes = sleepTotalMinutes === null ? null : sleepTotalMinutes % 60

  // step_count → steps for Home / future activity screen (cumulative).
  const steps = sumQty(findMetric(list, 'step_count'))

  // dietary_caffeine → total mg for the Energy screen (cumulative).
  const caffeineMg = sumQty(findMetric(list, 'dietary_caffeine'))

  // active_energy_burned → kcal for Nutrition / Home (cumulative).
  const activeEnergyKcal = sumQty(findMetric(list, 'active_energy_burned'))

  // dietary_water → hydration litres for Nutrition (cumulative; HAE unit is litres).
  const hydrationLitres = sumQty(findMetric(list, 'dietary_water'))

  return {
    restingHeartRate,
    averageHeartRate,
    hrv,
    sleepTotalMinutes,
    sleepHours,
    sleepMinutes,
    steps,
    caffeineMg,
    activeEnergyKcal,
    hydrationLitres,
  }
}
