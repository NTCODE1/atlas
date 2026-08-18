/**
 * Hard-coded fake data for the Atlas Home screen.
 * This stands in for real integrations — everything the UI renders comes from here.
 */
import type { IconId } from './icons'
import type { MicroAmounts } from './micros'

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
  label: 'Good',
  verdict: 'HRV up, well slept, caffeine clear — a good day to push the hard session.',
}

const clamp01to100 = (n: number) => Math.max(0, Math.min(100, n))

/**
 * Linear ramp scoring a value against a personal rolling baseline: 100 at/past
 * the baseline in the good direction, falling to 0 at `band` distance beyond
 * it in the bad direction. Shared by HRV-vs-baseline, RHR-vs-baseline, and
 * sleep's bedtime-consistency factor so the ramp math isn't duplicated.
 *
 * `direction: 'higherIsBetter'` — e.g. HRV: at/above baseline scores 100,
 * `band` below baseline scores 0.
 * `direction: 'lowerIsBetter'` — e.g. RHR/bedtime drift: at/below baseline
 * scores 100, `band` above baseline scores 0.
 */
export function baselineDeviationScore(
  value: number,
  baseline: number,
  band: number,
  direction: 'higherIsBetter' | 'lowerIsBetter',
): number {
  const deviation = direction === 'higherIsBetter' ? value - baseline : baseline - value
  if (deviation >= 0) return 100
  return clamp01to100(100 + (deviation / band) * 100)
}

/**
 * Score a value against a fixed healthy range: 100 anywhere inside [low, high],
 * falling off linearly outside EITHER bound, hitting 0 at `zeroDistance` past
 * it. Used for HRV, which (unlike RHR) doesn't just get "better" the higher it
 * goes — a reading well above your normal range can signal something's off
 * just as much as one well below it. Unlike a rolling personal baseline, this
 * needs no history — it's usable from day one.
 */
export function rangeDeviationScore(value: number, low: number, high: number, zeroDistance: number): number {
  if (value >= low && value <= high) return 100
  const distance = value < low ? low - value : value - high
  return clamp01to100(100 - (distance / zeroDistance) * 100)
}

/**
 * Sleep score config — Garmin-style: duration and stage architecture dominate,
 * overnight HRV stress and interruptions matter a little, bedtime consistency
 * matters least (quality over timing). Weights sum to 1.
 */
export const SLEEP_SCORE = {
  weights: { duration: 0.35, architecture: 0.35, hrvStress: 0.1, interruptions: 0.1, timing: 0.1 },
  /** Total sleep (minutes) that scores 100; capped, so >target adds nothing. 480 = 8h. */
  durationTargetMin: 480,
  /** Duration curve steepness: score = (actual/target)^exp · 100. >1 punishes short nights. */
  durationExponent: 1.5,
  /** Healthy deep share of total sleep [low, high]; score peaks at the midpoint (18%). */
  deepRange: [0.13, 0.23] as const,
  /** Healthy REM share of total sleep [low, high]; score peaks at the midpoint (22.5%). */
  remRange: [0.2, 0.25] as const,
  /**
   * Distance (share of total) from a stage's midpoint at which that stage scores 0.
   * 0.225 matches REM's midpoint (22.5%), so 0% REM — the worst real case — scores 0
   * instead of floor-ing in the 50s under the old, too-generous 0.5.
   */
  archZeroDistance: 0.225,
  /** Distance (ms) outside the user's healthy HRV range at which the stress sub-score hits 0. */
  hrvZeroDistanceMs: 20,
  /** Awake-minutes fraction of time-in-bed at which the interruptions sub-score hits 0. No
   *  discrete wake-count exists in the HAE payload, so this fraction is the closest proxy. */
  awakeFractionZero: 0.15,
  /** Bedtime drift from personal baseline (minutes) at which the timing sub-score hits 0. */
  bedtimeDriftBandMin: 90,
  /**
   * Score used for a sub-component when there's genuinely no data to judge it
   * by yet (no HRV baseline, no bedtime baseline, no awake reading) — deliberately
   * short of a perfect 100, since "unmeasured" isn't the same as "excellent".
   */
  noDataNeutralScore: 75,
}

/**
 * Compute a 0–100 sleep score for one night. Quality (duration + architecture
 * + HRV stress + interruptions = 90%) outweighs timing (bedtime consistency,
 * 10%) by design. Baseline/optional inputs default to a neutral 100 for that
 * sub-component when absent (not enough history yet, or metric not enabled).
 *
 *   sleepScore = 0.35·duration + 0.35·architecture + 0.1·hrvStress + 0.1·interruptions + 0.1·timing
 *
 *   • duration (35%):       min(total / 480, 1) ^ 1.5 · 100 · efficiency — steep
 *                           power curve, capped at 100, then scaled by sleep
 *                           efficiency (asleep ÷ time-in-bed) so extra time
 *                           spent awake still costs you even once you've hit
 *                           the 8h target: 5h→49, 5h42m→60, 6h→65, 7h→82, 8h→100
 *                           (all at 100% efficiency; less if there was awake time).
 *   • architecture (35%):   deep and REM scored SEPARATELY against their own
 *                           healthy ranges (deep 13–23%, REM 20–25%), then
 *                           averaged — a weak REM isn't masked by a strong deep.
 *   • hrvStress (10%):      overnight HRV (same-day average, since HAE has no
 *                           sleep-window-only HRV) vs your healthy range — 100
 *                           inside it, falling to 0 at 20ms past either bound.
 *   • interruptions (10%):  awake minutes as a fraction of time-in-bed — 0%
 *                           awake scores 100, falling to 0 at a 15% fraction.
 *   • timing (10%):         bedtime drift from your personal rolling average
 *                           bedtime — on-time scores 100, falling to 0 at 90min drift.
 *
 *   Sub-components with no data to judge yet (no HRV/bedtime baseline, or no
 *   awake reading) score `noDataNeutralScore` (75) rather than a perfect 100 —
 *   "unmeasured" isn't the same as "excellent".
 *
 *   Worked example — 5h42m, 29% deep / 11% REM, no HRV/awake/bedtime data yet:
 *     duration     = (342/480)^1.5·100·1          = 60  (efficiency=1, no awake data)
 *     deep         = 100 − |0.29−0.18|/0.225·100  = 51
 *     rem          = 100 − |0.11−0.225|/0.225·100 = 49
 *     architecture = (51 + 49) / 2                = 50
 *     hrvStress = interruptions = timing          = 75 (no data yet — neutral)
 *     sleepScore = 0.35·60 + 0.35·50 + 0.1·75 + 0.1·75 + 0.1·75 = 61
 */
export function computeSleepScore(input: {
  totalMinutes: number
  deepMinutes: number
  remMinutes: number
  awakeMinutes?: number | null
  hrv?: number | null
  hrvRangeLowMs: number
  hrvRangeHighMs: number
  bedtimeMinutes?: number | null
  bedtimeBaseline?: number | null
}): number {
  const { weights: w, noDataNeutralScore } = SLEEP_SCORE

  // Duration component: steep power curve vs the 8h target, capped at 100 —
  // then scaled by sleep efficiency (asleep ÷ time-in-bed) so hitting the
  // target only because of extra time spent awake in bed doesn't score the
  // same as a clean, uninterrupted night. No awake data yet → efficiency
  // defaults to 1 (neutral, doesn't penalize).
  const timeInBed = input.totalMinutes + (input.awakeMinutes ?? 0)
  const efficiency =
    input.awakeMinutes != null && timeInBed > 0 ? input.totalMinutes / timeInBed : 1
  const ratio = Math.min(input.totalMinutes / SLEEP_SCORE.durationTargetMin, 1)
  const durationScore = clamp01to100(ratio ** SLEEP_SCORE.durationExponent * 100 * efficiency)

  // Architecture component: per-stage closeness to the midpoint of its own range.
  const stageScore = (minutes: number, [low, high]: readonly [number, number]) => {
    if (input.totalMinutes <= 0) return 0
    const center = (low + high) / 2
    const distance = Math.abs(minutes / input.totalMinutes - center)
    return clamp01to100(100 - (distance / SLEEP_SCORE.archZeroDistance) * 100)
  }
  const deepScore = stageScore(input.deepMinutes, SLEEP_SCORE.deepRange)
  const remScore = stageScore(input.remMinutes, SLEEP_SCORE.remRange)
  const architectureScore = (deepScore + remScore) / 2

  // HRV stress: overnight (same-day-average) HRV vs the user's healthy range —
  // no baseline history needed, unlike the old personal-baseline approach.
  const hrvStressScore =
    input.hrv != null
      ? rangeDeviationScore(input.hrv, input.hrvRangeLowMs, input.hrvRangeHighMs, SLEEP_SCORE.hrvZeroDistanceMs)
      : noDataNeutralScore

  // Interruptions: awake minutes as a fraction of time-in-bed (timeInBed computed above).
  const interruptionsScore =
    input.awakeMinutes != null && timeInBed > 0
      ? clamp01to100(100 - (input.awakeMinutes / timeInBed / SLEEP_SCORE.awakeFractionZero) * 100)
      : noDataNeutralScore

  // Timing: bedtime drift from the personal rolling-average bedtime.
  const timingScore =
    input.bedtimeMinutes != null && input.bedtimeBaseline != null
      ? 100 -
        Math.min(
          Math.abs(input.bedtimeMinutes - input.bedtimeBaseline) / SLEEP_SCORE.bedtimeDriftBandMin,
          1,
        ) *
          100
      : noDataNeutralScore

  return clamp01to100(
    Math.round(
      durationScore * w.duration +
        architectureScore * w.architecture +
        hrvStressScore * w.hrvStress +
        interruptionsScore * w.interruptions +
        timingScore * w.timing,
    ),
  )
}

/** Sleep score bucket label, per the given thresholds. */
export function sleepScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Poor'
}

/**
 * Readiness scoring formula. Blends three recovery-science pillars into a
 * 0–100 score, plus a small caffeine boost on top:
 *
 *   readiness = 0.5·sleep + 0.3·recovery + 0.2·activity + 0.05·caffeineBoost
 *
 * Each pillar is a pre-computed 0–100 sub-score (the baseline/history math
 * that produces them lives in useReadiness.ts + dailySnapshot.ts, keeping this
 * function a simple, pure, testable blend). Caffeine is a *boost*, not a
 * drag — logging caffeine nudges readiness up a little, capped at +5 points,
 * with the total clamped to 100.
 */
export const READINESS = {
  /** sleep+recovery+activity sum to 1; caffeineBoost is additive on top. */
  weights: { sleep: 0.5, recovery: 0.3, activity: 0.2, caffeineBoost: 0.05 },
  /** Caffeine (mg) at which the boost hits its +5pt cap; 0 mg → 0 boost. */
  caffeineFullBoostMg: 200,
}

export type ReadinessContributor = 'sleep' | 'recovery' | 'activity' | 'caffeine'

export interface ReadinessResult {
  /** Final 0–100 readiness score. */
  score: number
  /** Per-contributor 0–100 health (higher = better), for the verdict. */
  subScores: Record<ReadinessContributor, number>
  /** The contributor with the lowest health sub-score. */
  weakest: ReadinessContributor
}

/**
 * Compute readiness from the three pre-computed pillar sub-scores plus
 * caffeine mg. Returns the score plus the per-contributor breakdown and
 * weakest link (caffeine is excluded from "weakest" since it's a boost, not
 * a health signal — it can't be the thing dragging readiness down).
 */
export function computeReadiness(input: {
  /** Blended: mostly tonight's sleep quality score, partly recent sleep debt. */
  sleepScore: number
  /** avg(HRV-vs-baseline, RHR-vs-baseline). */
  recoveryScore: number
  /** ACWR-derived: recent training strain vs long-term capacity. */
  activityScore: number
  caffeineMg: number
}): ReadinessResult {
  const { weights: w } = READINESS

  const sleepScore = clamp01to100(input.sleepScore)
  const recoveryScore = clamp01to100(input.recoveryScore)
  const activityScore = clamp01to100(input.activityScore)
  const caffeineBoost = clamp01to100((input.caffeineMg / READINESS.caffeineFullBoostMg) * 100)

  const score = clamp01to100(
    Math.round(
      sleepScore * w.sleep +
        recoveryScore * w.recovery +
        activityScore * w.activity +
        caffeineBoost * w.caffeineBoost,
    ),
  )

  const subScores: Record<ReadinessContributor, number> = {
    sleep: sleepScore,
    recovery: recoveryScore,
    activity: activityScore,
    caffeine: caffeineBoost,
  }
  const weakest = (['sleep', 'recovery', 'activity'] as const).reduce((a, b) =>
    subScores[a] <= subScores[b] ? a : b,
  )

  return { score, subScores, weakest }
}

/** Readiness score bucket label, per the given thresholds. */
export function readinessLabel(score: number): string {
  if (score >= 85) return 'Optimal'
  if (score >= 70) return 'Good'
  return 'Strained'
}

/** Verdict copy per contributor when it's the weakest link. */
const WEAKEST_VERDICT: Record<Exclude<ReadinessContributor, 'caffeine'>, string> = {
  sleep: 'Sleep is dragging readiness down — favour recovery over a hard session.',
  recovery: 'HRV/resting HR are off your baseline — your body is still catching up on recovery.',
  activity: 'Recent training load is high relative to your normal — keep it easy so you can absorb the work.',
}

/**
 * Verdict text for the readiness ring. When even the weakest contributor is
 * strong (≥ 80) everything's firing; otherwise name the weakest link.
 */
export function readinessVerdict(result: ReadinessResult): string {
  if (result.subScores[result.weakest] >= 80) {
    return 'Everything’s firing — a great day to push the hard session.'
  }
  return WEAKEST_VERDICT[result.weakest as Exclude<ReadinessContributor, 'caffeine'>]
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

/**
 * Fallback stat tiles for when there's no live health data at all yet. No
 * fake trend/spark here — Home.tsx computes those from real history
 * (atlas.snapshots) once it exists, and falls back to `sub` otherwise rather
 * than inventing a percent change or sparkline.
 */
export const stats: Stat[] = [
  {
    label: 'SLEEP',
    value: '7',
    unit: 'h',
    value2: '42',
    unit2: 'm',
    sub: 'no data yet',
    spark: [],
  },
  {
    label: 'HRV',
    value: '68',
    unit: 'ms',
    sub: 'no data yet',
    spark: [],
  },
  {
    label: 'CAFFEINE',
    value: '0',
    unit: 'mg',
    sub: 'clear',
    spark: [],
  },
]

/** Daily activity fallbacks — per-field defaults for the Home activity tiles
 *  (steps, active energy, average HR) when live health data is null. */
export const activity = {
  steps: 8231,
  activeKcal: 437,
  avgHeartRate: 62, // bpm
}

export const hydration = {
  value: '1.6',
  unit: 'L',
  goal: 'of 2.5 L goal',
  filled: 5,
  total: 6,
  /** Used by the Nutrition hydration card. */
  goalLitres: 2.5,
  percent: 64,
}

/**
 * Sample daily hydration (litres) for the current week, Mon→Sun. Fallback for
 * the hydration-average widget on days without a real snapshot yet, so the
 * weekly chart reads well before history accrues.
 */
export const hydrationWeek = [2.1, 1.8, 1.5, 2.3, 2.6, 1.9, 1.4]

// --- Sleep screen ------------------------------------------------------------

export type SleepStage = 'Awake' | 'REM' | 'Core' | 'Deep'

/** One contiguous span of a single stage, in chronological order. */
export interface SleepSegment {
  stage: SleepStage
  minutes: number
}

export const sleep = {
  totalMinutes: 462, // 7h 42m
  bedtime: '23:02', // 11:02 PM — in-bed start (fallback for live inBedStart)
  wakeTime: '06:55', // 6:55 AM — out-of-bed (fallback for live inBedEnd)
  sleepStart: '23:18', // fell asleep (fallback for live sleepStart)
  sleepEnd: '06:48', // final wake (fallback for live sleepEnd)
  deepMinutes: 78, // 1:18 · 17%
  remMinutes: 106, // 1:46 · 23%
  awakeMinutes: 14, // 14m  · 3%
  coreMinutes: 264, // 57% (derived: 462 - 78 - 106 - 14)
  lowestRestingHr: 58, // bpm
}

export interface SleepBalanceVerdict {
  label: string
  title: string
  text: string
}

/**
 * Real "sleep balance" verdict from tonight's actual deep/REM shares — compares
 * each stage's share of total sleep against its healthy range (same ranges
 * computeSleepScore's architecture component uses) and describes what
 * actually happened, rather than a fixed message that never changes.
 */
export function computeSleepBalance(
  deepMinutes: number,
  remMinutes: number,
  totalMinutes: number,
): SleepBalanceVerdict {
  const label = 'SLEEP BALANCE'
  if (totalMinutes <= 0) {
    return { label, title: 'No data', text: 'Not enough sleep data yet to judge deep/REM balance.' }
  }

  const deepPct = deepMinutes / totalMinutes
  const remPct = remMinutes / totalMinutes
  const [deepLow, deepHigh] = SLEEP_SCORE.deepRange
  const [remLow, remHigh] = SLEEP_SCORE.remRange
  const deepStatus: 'low' | 'good' | 'high' = deepPct < deepLow ? 'low' : deepPct > deepHigh ? 'high' : 'good'
  const remStatus: 'low' | 'good' | 'high' = remPct < remLow ? 'low' : remPct > remHigh ? 'high' : 'good'

  if (deepStatus === 'low' && remStatus === 'low') {
    return {
      label,
      title: 'Light night',
      text: 'Both deep and REM ran short tonight — physical and mental recovery were limited. An earlier night would help.',
    }
  }
  if (deepStatus === 'low') {
    return {
      label,
      title: 'REM-heavy',
      text: 'REM was solid, but deep sleep — physical recovery — ran short tonight.',
    }
  }
  if (remStatus === 'low') {
    return {
      label,
      title: 'Deep-heavy',
      text: 'Deep sleep was solid, but REM — mental recovery and memory — ran short tonight.',
    }
  }
  if (deepStatus === 'high' || remStatus === 'high') {
    return {
      label,
      title: 'Unusual mix',
      text: `${deepStatus === 'high' ? 'Deep' : 'REM'} sleep ran higher than typical tonight — worth watching if it continues.`,
    }
  }
  return {
    label,
    title: 'Restorative',
    text: 'Great mix of deep and REM. Your body and mind got the recovery they needed.',
  }
}

/**
 * Hypnogram timeline — segments sum to sleep.totalMinutes (462), and the
 * per-stage totals match the sleep.* fields (Deep 78, REM 106, Awake 14,
 * Core 264). Shape mirrors the mockup: an Awake spike at the start, deep dips
 * early, REM presence growing later, Awake spikes mid-night and just before
 * wake (ending on a final spike).
 */
export const sleepStages: SleepSegment[] = [
  { stage: 'Awake', minutes: 3 },
  { stage: 'Core', minutes: 38 },
  { stage: 'Deep', minutes: 34 },
  { stage: 'Core', minutes: 26 },
  { stage: 'REM', minutes: 14 },
  { stage: 'Core', minutes: 22 },
  { stage: 'REM', minutes: 24 },
  { stage: 'Awake', minutes: 4 },
  { stage: 'Core', minutes: 30 },
  { stage: 'Deep', minutes: 28 },
  { stage: 'Core', minutes: 24 },
  { stage: 'REM', minutes: 22 },
  { stage: 'Core', minutes: 26 },
  { stage: 'Deep', minutes: 16 },
  { stage: 'Core', minutes: 28 },
  { stage: 'REM', minutes: 24 },
  { stage: 'Core', minutes: 18 },
  { stage: 'Awake', minutes: 3 },
  { stage: 'Core', minutes: 22 },
  { stage: 'REM', minutes: 22 },
  { stage: 'Core', minutes: 30 },
  { stage: 'Awake', minutes: 4 },
]

/** 462 -> "7h 42m", 24 -> "24m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Stat-tile time: 78 -> "1:18", 14 -> "14" (caller shows the "m" unit). */
export function formatSleepStat(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** "23:02" -> "11:02 PM"; "02:00" -> "2 AM" (drops :00). */
export function formatClock12(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return m === 0 ? `${h} ${period}` : `${h}:${String(m).padStart(2, '0')} ${period}`
}

// --- Journal screen ----------------------------------------------------------

export type JournalActivity = 'run' | 'strength' | 'swim' | 'rest' | 'sleep' | 'journal'

export interface DayEntry {
  text: string
  /** "HH:MM" 24-hour. */
  time: string
  tag: string
}

export interface DayRecord {
  activity?: JournalActivity
  entry?: DayEntry
}

/** Editable store: day-of-month -> record, for a single month. */
export type JournalMonth = Record<number, DayRecord>

// Journal v2: multiple timed entries per day, an icon from the shared registry,
// and a per-entry importance flag. Legacy types above are kept as migration input.

export interface DayEntryV2 {
  id: string
  text: string
  /** "HH:MM" 24-hour (start time). */
  time: string
  /** Optional "HH:MM" end time for events with a duration. */
  endTime?: string
  tag: string
  /** 'event' (timed, default) or 'task' (checkable). Absent = event. */
  kind?: 'event' | 'task'
  /** Completion state for tasks. */
  done?: boolean
  important?: boolean
}

export interface DayRecordV2 {
  /** Icon id from src/icons.ts; legacy activities are valid ids. */
  icon?: IconId
  entries: DayEntryV2[]
}

/** V2 store: day-of-month -> record, persisted under atlas.journal.v2.*. */
export type JournalMonthV2 = Record<number, DayRecordV2>

export interface GridCell {
  day: number
  /** True only for days belonging to the displayed month (editable). */
  inMonth: boolean
  isToday: boolean
}

export interface MonthGrid {
  year: number
  monthIndex: number
  monthLabel: string
  weeks: GridCell[][]
}

/** Tag presets offered in the day editor. */
export const ENTRY_TAGS = ['FOCUS', 'BODY', 'MIND', 'RECOVERY']

/**
 * Per-tag shade, drawn from the existing monochrome accent ramp (no new hues) so
 * entries/categories read as distinct without breaking the mono design system.
 */
const ENTRY_TAG_COLORS: Record<string, string> = {
  FOCUS: 'var(--color-accent)',
  BODY: 'var(--color-sky)',
  MIND: 'var(--color-cyan)',
  RECOVERY: 'var(--color-royal)',
}

/** Shade for a tag; falls back to the accent shade for any unrecognized tag. */
export function tagColor(tag: string): string {
  return ENTRY_TAG_COLORS[tag] ?? 'var(--color-accent)'
}

/**
 * Builds a Monday-first calendar grid for the month containing `date`, padded
 * with the trailing days of the previous month and leading days of the next so
 * every week is a full row of 7. `inMonth` marks the real month's days; today
 * is flagged when `date` falls in that month.
 */
export function buildMonthGrid(date = new Date()): MonthGrid {
  const year = date.getFullYear()
  const monthIndex = date.getMonth()

  // "Today" only applies when the displayed month is the real current month —
  // otherwise navigating to another month would falsely flag a day.
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex
  const today = now.getDate()

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrev = new Date(year, monthIndex, 0).getDate()
  // Monday-first offset: JS getDay() is 0=Sun .. 6=Sat.
  const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7

  const cells: GridCell[] = []
  for (let i = 0; i < lead; i++) {
    cells.push({ day: daysInPrev - lead + 1 + i, inMonth: false, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, isToday: isCurrentMonth && d === today })
  }
  let next = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: next++, inMonth: false, isToday: false })
  }

  const weeks: GridCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return {
    year,
    monthIndex,
    monthLabel: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    weeks,
  }
}

/** day -> "Friday, Jun 27" for the given month. */
export function formatEntryDate(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Journal seed — intentionally empty so the calendar starts blank and the user
 * fills in their own events, tasks, and journal entries.
 */
export const journalSeed: JournalMonth = {}

// --- Nutrition screen --------------------------------------------------------

export type MacroColor = 'mint' | 'amber' | 'indigo'

export interface MacroRingData {
  label: string
  grams: number
  target: number
  color: MacroColor
}

export const nutrition = {
  consumed: 1840,
  target: 2150,
  unit: 'kcal',
  macros: [
    { label: 'Protein', grams: 132, target: 150, color: 'mint' },
    { label: 'Carbs', grams: 186, target: 220, color: 'amber' },
    { label: 'Fat', grams: 61, target: 70, color: 'indigo' },
  ] as MacroRingData[],
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal {
  id: string
  type: MealType
  name: string
  /** Calories; omitted for raw text-only entries (shown as "—"). */
  kcal?: number
  /** Protein in grams (from AI estimate); omitted when unknown. */
  protein?: number
  /** Carbohydrates in grams (from AI estimate); omitted when unknown. */
  carbs?: number
  /** Fat in grams (from AI estimate); omitted when unknown. */
  fat?: number
  /** Micronutrients (from AI estimate), in each key's unit; omitted when unknown. */
  micros?: MicroAmounts
  /** Day the meal belongs to, YYYY-MM-DD. Absent on legacy seed entries. */
  date?: string
  /** ISO timestamp the entry was logged. Absent on legacy seed entries. */
  createdAt?: string
}

/** Seed meals for the display-only fallback; live logging uses useMeals(). */
export const meals: Meal[] = [
  { id: 'm1', type: 'breakfast', name: 'Eggs, oatmeal, blueberries', kcal: 520 },
  { id: 'm2', type: 'lunch', name: 'Chicken & rice bowl', kcal: 740 },
  { id: 'm3', type: 'snack', name: 'Greek yogurt & almonds', kcal: 580 },
]

export interface Micronutrient {
  label: string
  percent: number
}

export const micronutrients: Micronutrient[] = [
  { label: 'Vitamin D', percent: 82 },
  { label: 'Magnesium', percent: 67 },
  { label: 'Iron', percent: 74 },
  { label: 'Omega-3', percent: 91 },
]

/** Time-of-day default meal: <11 breakfast, <15 lunch, <18 snack, else dinner. */
export function defaultMealType(now = new Date()): MealType {
  const h = now.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

// --- Training screen ---------------------------------------------------------

export interface TrainingDay {
  /** Single-letter label, Mon–Sun. */
  label: string
  /** Daily load in arbitrary units (au); 0 = rest day. */
  load: number
  /** Marks the current day (highlighted mint bar). */
  isToday?: boolean
}

export const training = {
  weeklyLoad: 328,
  unit: 'au',
  /** Status label beside the number, e.g. "balanced". */
  status: 'balanced',
  period: 'This week',
  /** 7 days Mon–Sun; Saturday is today and the highlighted bar. */
  days: [
    { label: 'M', load: 52 },
    { label: 'T', load: 18 },
    { label: 'W', load: 74 },
    { label: 'T', load: 30 },
    { label: 'F', load: 22 },
    { label: 'S', load: 86, isToday: true },
    { label: 'S', load: 46 },
  ] as TrainingDay[],
  completedSessions: 2,
  /** Sessions trend vs last week. */
  sessionsTrend: '+12%',
}

export interface UpNextSession {
  name: string
  durationMin: number
  intensity: string
  distance: string
  heartRate: string
  zone: string
}

/** The next prescribed session from the training plan. */
export const upNext: UpNextSession = {
  name: 'Zone-2 Run',
  durationMin: 45,
  intensity: 'easy aerobic',
  distance: '2.6 mi',
  heartRate: '120–140 bpm',
  zone: 'Zone 2',
}

export const todaysTarget = {
  score: 78,
  label: 'GOOD',
  title: 'Adjusted to your readiness',
  text: 'Readiness was 78 (Good) — your target was scaled to support progression.',
}
