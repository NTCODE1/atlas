/**
 * Maps a raw Health Auto Export (HAE) payload into the flat, screen-friendly
 * shape the Apex UI expects (see ../data.ts for the hard-coded equivalents).
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
 * The same `null`-and-fall-back path also covers a metric that's present but
 * has no data point for today (see mapHealthData's `today` param below) — a
 * day-scoped field never silently reports another day's reading as today's.
 *
 * Day-scoped vs latest-sample fields: heart rate, HRV, sleep, steps,
 * caffeine, active energy, and hydration are anchored to today's own data
 * only (a manual backfill import of past days must not overwrite them — see
 * todaysPoints). sleep_analysis is matched by wake time instead, not its
 * generic `date` field (see todaysSleepPoints) — HAE dates a night's sleep
 * ambiguously (sometimes the evening it started), so a plain date match can
 * drop last night's session entirely and silently zero out today's sleep
 * score. Body composition (weight/BMI/body fat/lean mass) and VO2 max
 * update irregularly, so those intentionally keep using the latest sample
 * regardless of date.
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

/** The mapped output consumed by Apex screens. Every field is nullable so a
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
  // --- Body composition (Tunturi SC30 scale → FitDays → Apple Health) ---
  /** Latest body weight (kg) → Home weight tile + WeightSheet. From `weight_body_mass`. */
  weightKg: number | null
  /** Date (local YYYY-MM-DD) of the latest body-weight sample. */
  weightDate: string | null
  /** Body-fat percentage (0–100) → WeightSheet. From `body_fat_percentage`. */
  bodyFatPercentage: number | null
  /** Body mass index → WeightSheet. From `body_mass_index`. */
  bmi: number | null
  /** Lean body mass (kg) → WeightSheet. From `lean_body_mass`. */
  leanBodyMassKg: number | null
  /** VO2 max (ml/kg/min) → Training screen Cardio tab. From `vo2_max`/`cardio_fitness`. */
  vo2Max: number | null
}

/** Health Auto Export reports active_energy in kJ; multiply to get kcal. */
const KJ_TO_KCAL = 0.239006

/** Pounds → kilograms, for normalizing body-mass metrics exported in lb. */
const LB_TO_KG = 0.453592

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
    weightKg: null,
    weightDate: null,
    bodyFatPercentage: null,
    bmi: null,
    leanBodyMassKg: null,
    vo2Max: null,
  }
}

/** Find the metric with the given HAE name, or undefined if not present. */
function findMetric(metrics: Metric[], name: string): Metric | undefined {
  return metrics.find((m) => m?.name === name)
}

/** Find a metric by any of several possible HAE names (naming varies by export version/source). */
function findMetricByNames(metrics: Metric[], names: string[]): Metric | undefined {
  for (const name of names) {
    const m = findMetric(metrics, name)
    if (m) return m
  }
  return undefined
}

/** Non-empty data points for a metric, or null if the metric/points are absent. */
function points(metric: Metric | undefined): MetricDataPoint[] | null {
  if (!metric || !Array.isArray(metric.data) || metric.data.length === 0) return null
  return metric.data
}

/**
 * Numeric values of a named field, restricted to points dated exactly `today`
 * (empty array if none) — HAE payloads often include several recent days so
 * historical corrections and backfills sync properly, but "today's" value
 * must come from today's own reading, never blended with or substituted by
 * another day just because it happens to be present in the same payload (see
 * todaysPoints).
 */
function fieldValues(metric: Metric | undefined, field: keyof MetricDataPoint, today: string): number[] {
  const pts = points(metric)
  if (!pts) return []
  return todaysPoints(pts, today)
    .map((p) => p[field])
    .filter((v): v is number => typeof v === 'number')
}

/** Sum of `qty` across today's points — for cumulative totals (steps, caffeine, …). */
function sumQty(metric: Metric | undefined, today: string): number | null {
  const values = fieldValues(metric, 'qty', today)
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0)
}

/** Average of `qty` across today's points — for instantaneous metrics stored as qty (HRV, resting HR). */
function avgQty(metric: Metric | undefined, today: string): number | null {
  const values = fieldValues(metric, 'qty', today)
  if (values.length === 0) return null
  return values.reduce((sum, q) => sum + q, 0) / values.length
}

/** Average of a named aggregate field (e.g. "Avg") across today's points. */
function avgField(metric: Metric | undefined, field: 'Avg' | 'Min' | 'Max', today: string): number | null {
  const values = fieldValues(metric, field, today)
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * The most recent data point of a metric — the one with the latest parseable
 * sample timestamp (falls back to the last point if none parse). Used for
 * instantaneous body-composition samples so multiple weigh-ins in a payload
 * collapse to the newest, matching the app's "one weigh-in per day, latest wins".
 */
function latestPoint(metric: Metric | undefined): MetricDataPoint | null {
  const pts = points(metric)
  if (!pts) return null
  let best: MetricDataPoint | null = null
  let bestT = -Infinity
  for (const p of pts) {
    const d = parseHaeDate(p.date)
    if (d && d.getTime() >= bestT) {
      bestT = d.getTime()
      best = p
    }
  }
  return best ?? pts[pts.length - 1]
}

/** Numeric value of a point, preferring `qty` then `Avg`. */
function pointValue(p: MetricDataPoint | null): number | null {
  if (!p) return null
  if (typeof p.qty === 'number') return p.qty
  if (typeof p.Avg === 'number') return p.Avg
  return null
}

/** Latest sample value of a scalar metric (e.g. BMI, body fat), or null. */
function latestValue(metric: Metric | undefined): number | null {
  return pointValue(latestPoint(metric))
}

/** Normalize a mass value to kg using the metric's declared units (kg unless lb). */
function massToKg(value: number | null, metric: Metric | undefined): number | null {
  if (value === null) return null
  return /lb/.test((metric?.units ?? '').toLowerCase()) ? value * LB_TO_KG : value
}

/** YYYY-MM-DD in local time — a calendar-day grouping key. */
function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Restrict points to exactly `today` (by each point's own `date` field) —
 * NOT merely the freshest calendar date present in the metric's data. HAE
 * payloads often include several recent nights/days so historical
 * corrections and backfills sync properly; a manual backfill import (e.g.
 * re-syncing "last week") may contain no point for today at all. Picking
 * "whatever date is newest in this particular payload" would then silently
 * treat a stale past night/day as today's live reading — which is exactly
 * what corrupted the Sleep/Readiness scores, since they read straight from
 * this today-anchored data (see useReadiness.ts). Points with no parseable
 * date are kept as-is only when NONE of the metric's points have a parseable
 * date (better to include than silently drop); otherwise anything not dated
 * `today` — parseable or not — is dropped.
 */
function todaysPoints(pts: MetricDataPoint[], today: string): MetricDataPoint[] {
  const dated = pts
    .map((p) => ({ p, d: parseHaeDate(p.date) }))
    .filter((x): x is { p: MetricDataPoint; d: Date } => x.d !== null)
  if (dated.length === 0) return pts
  return dated.filter((x) => localDayKey(x.d) === today).map((x) => x.p)
}

/**
 * Which calendar day a sleep_analysis point belongs to, for matching against
 * `today`. Deliberately NOT the point's generic `date` field: HAE's aggregate
 * `date` for a night's sleep is ambiguous across export versions/sources — it
 * can be stamped to the evening the session started rather than the morning
 * the person woke up. A night that starts Aug 17 and ends Aug 18 dated
 * "2026-08-17" would then get dropped by a same-day-only filter, even though
 * it's the sleep the user just woke from and unambiguously "today's sleep".
 * `sleepEnd` (wake time, falling back to `inBedEnd`, then `date`) is the
 * correct signal because "today's sleep" means the session you woke up from
 * today, not the one whose label happens to say today.
 */
function sleepNightDay(p: MetricDataPoint): Date | null {
  return parseHaeDate(p.sleepEnd) ?? parseHaeDate(p.inBedEnd) ?? parseHaeDate(p.date)
}

/**
 * Sleep points whose night belongs to `today` (see sleepNightDay) — the
 * sleep-specific counterpart to todaysPoints, used for every sleep_analysis
 * field so a multi-night backfill payload can't blend past nights into
 * tonight's duration/stages/clock-times, while still recognizing last
 * night's session as "today's" regardless of how its `date` field is dated.
 */
function todaysSleepPoints(pts: MetricDataPoint[], today: string): MetricDataPoint[] {
  const dated = pts
    .map((p) => ({ p, d: sleepNightDay(p) }))
    .filter((x): x is { p: MetricDataPoint; d: Date } => x.d !== null)
  if (dated.length === 0) return pts
  return dated.filter((x) => localDayKey(x.d) === today).map((x) => x.p)
}

/**
 * Numeric values of a named sleep field, restricted to tonight's points by
 * todaysSleepPoints rather than the generic date-based fieldValues.
 */
function sleepFieldValues(metric: Metric | undefined, field: keyof MetricDataPoint, today: string): number[] {
  const pts = points(metric)
  if (!pts) return []
  return todaysSleepPoints(pts, today)
    .map((p) => p[field])
    .filter((v): v is number => typeof v === 'number')
}

/**
 * Sum a named sleep field (in hours, restricted to tonight by
 * sleepFieldValues) and convert to minutes, or null if absent. Summing
 * handles payloads that split that single night into segments.
 */
function sleepFieldMinutes(
  metric: Metric | undefined,
  field: 'totalSleep' | 'deep' | 'core' | 'rem' | 'awake',
  today: string,
): number | null {
  const values = sleepFieldValues(metric, field, today)
  if (values.length === 0) return null
  const hours = values.reduce((sum, h) => sum + h, 0)
  return Math.round(hours * 60)
}

/**
 * Parse an HAE timestamp to a Date, or null. Accepts ISO and HAE's
 * "yyyy-MM-dd HH:mm:ss +0000" (space-separated, numeric offset) by normalizing
 * the space to `T` and the offset to `+00:00` on the fallback path.
 */
export function parseHaeDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return direct
  const iso = raw.trim().replace(' ', 'T').replace(/\s*([+-]\d{2})(\d{2})$/, '$1:$2')
  const normalized = new Date(iso)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

/** Local "HH:MM" (device timezone) for a Date. */
export function hhmmLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Earliest/latest timestamp of a named field across today's points, as local
 * "HH:MM" — or null if absent/unparseable. `earliest` suits start fields,
 * `latest` suits end fields when HAE splits that night into segments.
 * Restricted to today so a multi-day (or backfill) payload can't pick a
 * stale start/end time from an earlier night.
 */
function sleepClock(
  metric: Metric | undefined,
  field: 'sleepStart' | 'sleepEnd' | 'inBedStart' | 'inBedEnd',
  pick: 'earliest' | 'latest',
  today: string,
): string | null {
  const pts = points(metric)
  if (!pts) return null
  const dates = todaysSleepPoints(pts, today)
    .map((p) => parseHaeDate(p[field]))
    .filter((d): d is Date => d !== null)
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

/**
 * Maps a raw HAE payload into today's flat health snapshot. `today` anchors
 * every day-scoped metric below (heart rate, HRV, sleep, steps, caffeine,
 * active energy, hydration) to the real current calendar date — defaulting
 * to the device's actual today — rather than "whichever date happens to be
 * newest in this payload". That distinction matters: HAE re-syncs and manual
 * backfills (e.g. re-exporting "last week" to patch a gap) legitimately post
 * payloads whose freshest contained date isn't today at all, and this must
 * never be read as if it were — that's what silently corrupted the
 * Sleep/Readiness scores (see todaysPoints). Body-composition metrics
 * (weight/BMI/body fat/lean mass) and VO2 max are deliberately exempt — they
 * update irregularly (not daily), so they always take the latest sample
 * regardless of date, same as before.
 */
export function mapHealthData(payload: unknown, today: string = localDayKey(new Date())): HealthData {
  const metrics = (payload as { data?: { metrics?: unknown } } | null | undefined)?.data?.metrics
  if (!Array.isArray(metrics)) return emptyHealthData()

  const list = metrics as Metric[]

  // heart_rate → average HR (Avg) for Sleep/Readiness. (Capitalized Avg/Min/Max.)
  const averageHeartRate = avgField(findMetric(list, 'heart_rate'), 'Avg', today)

  // resting_heart_rate → resting HR for Readiness/Sleep. Null until this metric is
  // enabled in the automation — intentionally NOT derived from heart_rate Min.
  const restingHeartRate = avgQty(findMetric(list, 'resting_heart_rate'), today)

  // heart_rate_variability → HRV (ms) for Home tiles + Readiness. Null until added.
  const hrv = avgQty(findMetric(list, 'heart_rate_variability'), today)

  // sleep_analysis → durations in hours → minutes. totalSleep drives the Home/Sleep
  // duration display; deep/rem/awake/core feed the Sleep screen stage tiles.
  const sleepMetric = findMetric(list, 'sleep_analysis')
  const sleepTotalMinutes = sleepFieldMinutes(sleepMetric, 'totalSleep', today)
  const sleepHours = sleepTotalMinutes === null ? null : Math.floor(sleepTotalMinutes / 60)
  const sleepMinutes = sleepTotalMinutes === null ? null : sleepTotalMinutes % 60
  const sleepDeepMinutes = sleepFieldMinutes(sleepMetric, 'deep', today)
  const sleepRemMinutes = sleepFieldMinutes(sleepMetric, 'rem', today)
  const sleepAwakeMinutes = sleepFieldMinutes(sleepMetric, 'awake', today)
  const sleepCoreMinutes = sleepFieldMinutes(sleepMetric, 'core', today)

  // sleep_analysis timestamps → local "HH:MM" clock times for the Sleep screen.
  const sleepStart = sleepClock(sleepMetric, 'sleepStart', 'earliest', today)
  const sleepEnd = sleepClock(sleepMetric, 'sleepEnd', 'latest', today)
  const inBedStart = sleepClock(sleepMetric, 'inBedStart', 'earliest', today)
  const inBedEnd = sleepClock(sleepMetric, 'inBedEnd', 'latest', today)

  // step_count → steps for Home / future activity screen (cumulative qty).
  const stepsRaw = sumQty(findMetric(list, 'step_count'), today)
  const steps = stepsRaw === null ? null : Math.round(stepsRaw)

  // dietary_caffeine → total mg for the Energy screen (cumulative). Null until added.
  const caffeineMg = sumQty(findMetric(list, 'dietary_caffeine'), today)

  // active_energy → kJ; convert to kcal for Nutrition / Home (cumulative qty).
  const activeEnergyKj = sumQty(findMetric(list, 'active_energy'), today)
  const activeEnergyKcal = activeEnergyKj === null ? null : Math.round(activeEnergyKj * KJ_TO_KCAL)

  // dietary_water → hydration litres for Nutrition (cumulative). Null until added.
  const hydrationLitres = sumQty(findMetric(list, 'dietary_water'), today)

  // Body composition (Tunturi SC30 scale → FitDays → Apple Health). These are
  // instantaneous samples: keep the most recent per payload (latest by sample
  // timestamp) so same-day multiple weigh-ins collapse to the newest reading.
  const weightMetric = findMetric(list, 'weight_body_mass')
  const weightPoint = latestPoint(weightMetric)
  const weightKg = massToKg(pointValue(weightPoint), weightMetric)
  const weightPointDate = weightPoint ? parseHaeDate(weightPoint.date) : null
  const weightDate = weightPointDate ? localDayKey(weightPointDate) : null

  const leanMetric = findMetric(list, 'lean_body_mass')
  const leanBodyMassKg = massToKg(latestValue(leanMetric), leanMetric)

  const bmi = latestValue(findMetric(list, 'body_mass_index'))

  // HealthKit stores body fat as a fraction; HAE may export 0–1 or 0–100 — normalize to %.
  const rawBodyFat = latestValue(findMetric(list, 'body_fat_percentage'))
  const bodyFatPercentage =
    rawBodyFat === null ? null : rawBodyFat <= 1 ? rawBodyFat * 100 : rawBodyFat

  // VO2 max (ml/kg/min) — updates infrequently, so take the latest sample. HAE has
  // exported this under both names depending on version/source.
  const vo2Max = latestValue(findMetricByNames(list, ['vo2_max', 'cardio_fitness']))

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
    weightKg,
    weightDate,
    bodyFatPercentage,
    bmi,
    leanBodyMassKg,
    vo2Max,
  }
}

/** One dated sample of a metric, for trend charts (see LineChart's ChartPoint). */
export interface MetricPoint {
  t: string
  v: number
}

/**
 * Every dated `qty` sample of a named metric, oldest first — for metrics like
 * VO2 max where each point is a separate historical reading rather than a
 * same-day aggregate. Never throws; empty array if the metric/points/dates
 * are absent.
 */
export function mapMetricSeries(payload: unknown, names: string[]): MetricPoint[] {
  const metrics = (payload as { data?: { metrics?: unknown } } | null | undefined)?.data?.metrics
  if (!Array.isArray(metrics)) return []
  const metric = findMetricByNames(metrics as Metric[], names)
  const pts = points(metric)
  if (!pts) return []
  return pts
    .map((p): MetricPoint | null => {
      const d = parseHaeDate(p.date)
      const v = pointValue(p)
      return d && v !== null ? { t: d.toISOString().slice(0, 10), v } : null
    })
    .filter((p): p is MetricPoint => p !== null)
    .sort((a, b) => a.t.localeCompare(b.t))
}
