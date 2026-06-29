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

/**
 * Readiness scoring formula. Blends four daily signals into a 0–100 score,
 * used by the Home ring when live values are available (else `readiness.score`).
 *
 * Each signal is normalized to a 0–100 sub-score against a target/range, then
 * combined with the weights below. Tweak the targets and weights freely — this
 * is a sensible starting point, not a clinical model.
 */
export const READINESS = {
  /** Sub-score weights (should sum to 1). */
  weights: { hrv: 0.35, sleep: 0.35, restingHr: 0.2, caffeine: 0.1 },
  /** HRV (ms) that scores 100; higher is better. */
  hrvTargetMs: 80,
  /** Sleep (minutes) that scores 100; higher is better. 480 = 8h. */
  sleepTargetMin: 480,
  /** Resting HR band (bpm): restingHrBest scores 100, restingHrWorst scores 0. */
  restingHrBest: 48,
  restingHrWorst: 75,
  /** Caffeine (mg) at which the caffeine sub-score hits 0; 0 mg scores 100. */
  caffeineZeroMg: 400,
}

const clamp01to100 = (n: number) => Math.max(0, Math.min(100, n))

/**
 * Compute a 0–100 readiness score from live daily metrics. All four inputs are
 * required; the caller should fall back to `readiness.score` if any are missing.
 */
export function computeReadiness(input: {
  hrv: number
  sleepMinutes: number
  restingHr: number
  caffeineMg: number
}): number {
  const { weights: w } = READINESS

  // HRV: higher is better, capped at the target.
  const hrvScore = clamp01to100((input.hrv / READINESS.hrvTargetMs) * 100)
  // Sleep: more is better, capped at the target.
  const sleepScore = clamp01to100((input.sleepMinutes / READINESS.sleepTargetMin) * 100)
  // Resting HR: lower is better, mapped across the best→worst band (inverted).
  const rhrScore = clamp01to100(
    ((READINESS.restingHrWorst - input.restingHr) /
      (READINESS.restingHrWorst - READINESS.restingHrBest)) *
      100,
  )
  // Caffeine: less residual is better; 0 mg → 100, caffeineZeroMg → 0.
  const caffeineScore = clamp01to100(100 - (input.caffeineMg / READINESS.caffeineZeroMg) * 100)

  return Math.round(
    hrvScore * w.hrv +
      sleepScore * w.sleep +
      rhrScore * w.restingHr +
      caffeineScore * w.caffeine,
  )
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
  /** Used by the Nutrition hydration card. */
  goalLitres: 2.5,
  percent: 64,
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

// --- Sleep screen ------------------------------------------------------------

export type SleepStage = 'Awake' | 'REM' | 'Core' | 'Deep'

/** One contiguous span of a single stage, in chronological order. */
export interface SleepSegment {
  stage: SleepStage
  minutes: number
}

export const sleep = {
  totalMinutes: 462, // 7h 42m
  score: 91,
  bedtime: '23:02', // 11:02 PM
  wakeTime: '06:55', // 6:55 AM
  deepMinutes: 78, // 1:18 · 17%
  remMinutes: 106, // 1:46 · 23%
  awakeMinutes: 14, // 14m  · 3%
  coreMinutes: 264, // 57% (derived: 462 - 78 - 106 - 14)
  lowestRestingHr: 58, // bpm
}

export const sleepBalance = {
  label: 'SLEEP BALANCE',
  title: 'Restorative',
  text: 'Great mix of deep and REM. Your body and mind got the recovery they needed.',
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
  if (minutes < 60) return String(minutes)
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
 * Builds a Monday-first calendar grid for the month containing `date`, padded
 * with the trailing days of the previous month and leading days of the next so
 * every week is a full row of 7. `inMonth` marks the real month's days; today
 * is flagged when `date` falls in that month.
 */
export function buildMonthGrid(date = new Date()): MonthGrid {
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const today = date.getDate()

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrev = new Date(year, monthIndex, 0).getDate()
  // Monday-first offset: JS getDay() is 0=Sun .. 6=Sat.
  const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7

  const cells: GridCell[] = []
  for (let i = 0; i < lead; i++) {
    cells.push({ day: daysInPrev - lead + 1 + i, inMonth: false, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, isToday: d === today })
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
 * Seed data for the current month — a plausible spread of activities plus a few
 * journal entries. Persisted to localStorage on first load, then user-editable.
 */
export const journalSeed: JournalMonth = {
  2: { activity: 'strength' },
  3: { activity: 'run' },
  4: { activity: 'swim' },
  6: { activity: 'rest' },
  8: { activity: 'strength', entry: { text: 'Heavy squats felt strong — bumped the top set.', time: '18:30', tag: 'BODY' } },
  9: { activity: 'sleep' },
  10: { activity: 'run', entry: { text: 'Easy morning run by the river. Legs fresh.', time: '07:15', tag: 'FOCUS' } },
  11: { activity: 'run' },
  13: { activity: 'swim' },
  14: { activity: 'rest' },
  15: { activity: 'strength' },
  16: { activity: 'strength' },
  17: { activity: 'run' },
  19: { activity: 'swim', entry: { text: 'Long swim — smooth and unhurried.', time: '12:40', tag: 'RECOVERY' } },
  22: { activity: 'journal', entry: { text: 'Reflected on the quarter. Direction feels clear.', time: '22:05', tag: 'MIND' } },
  24: { activity: 'strength' },
  25: { activity: 'run' },
  26: { activity: 'run', entry: { text: 'Tempo run, negative split. Pleased with the legs.', time: '06:50', tag: 'BODY' } },
  27: { entry: { text: 'Shipped the readiness engine. Felt sharp all day — the early run helped.', time: '21:10', tag: 'FOCUS' } },
  28: { activity: 'rest' },
}

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
}

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
