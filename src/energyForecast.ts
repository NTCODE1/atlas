// --- Energy screen: intraday energy forecast --------------------------------
//
// A predicted alertness/energy curve across the day, blending:
//   • recovery baseline  — the day's true capacity, from the readiness model
//   • circadian rhythm   — biphasic: morning peak, afternoon dip, evening bump
//   • caffeine boost     — a saturating lift while caffeine is in the system
//   • activity fatigue   — a small evening drag from a heavy movement day
//
// It is a heuristic, not a clinical model — the constants are hand-tuned to feel
// right and are easy to adjust. Pure module (no React), mirroring caffeine.ts.

import {
  caffeine,
  caffeineLevelAt,
  hoursToTime,
  timeToHours,
  type CaffeineDose,
} from './caffeine'
import { computeReadiness } from './data'

const { dayStartHour: START, dayEndHour: END } = caffeine

export interface EnergyForecastInput {
  doses: CaffeineDose[]
  /** 0–100 sleep score. */
  sleepScore: number
  /** 0–100 avg(HRV-vs-baseline, RHR-vs-baseline) — see useReadiness.ts. */
  recoveryScore: number
  /** 0–100 ACWR-derived training-strain-vs-capacity score — see useReadiness.ts. */
  activityScore: number
  steps: number
  activeKcal: number
  /** Current time in decimal hours. */
  nowHour: number
  /** Hours into the current fast (0 when not fasting). */
  fastingHours?: number
  /** Hydration as a fraction of the daily goal (1 = fully hydrated). */
  hydrationRatio?: number
  // NOTE: nutrition (calories/protein) will plug in here as a baseline modifier
  // once meals are actually persisted — today they're in-memory sample data, so
  // they're deliberately left out to avoid a misleading signal.
}

export interface EnergyWindow {
  start: number
  end: number
}

export interface EnergyForecast {
  samples: { hour: number; energy: number }[]
  nowEnergy: number
  nowState: 'Peaking' | 'Steady' | 'Dipping' | 'Winding down'
  /** Forward-looking high-energy spans (best focus). */
  focusWindows: EnergyWindow[]
  /** Afternoon dip low point (decimal hour), if found. */
  dipHour: number | null
  /** Latest clock time a standard dose keeps caffeine under the sleep threshold
      by bedtime — "HH:MM", or null if there's no room today. */
  caffeineCutoff: string | null
}

const SAMPLE_STEP = 0.25
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const gaussian = (h: number, center: number, width: number) =>
  Math.exp(-((h - center) ** 2) / (2 * width * width))

/**
 * Biphasic circadian multiplier for hour h, roughly in [0.7, 1.05]. Built from
 * placed features so the shape is legible and tunable: sleep-inertia grogginess
 * before ~8:00, an afternoon dip centred ~14:30 (deeper when under-slept), an
 * evening "second wind" ~18:30, and a night-time decline after ~20:30.
 */
function circadian(h: number, sleepDebt: number): number {
  let shape = 1.0
  if (h < 8) shape -= 0.28 * (8 - h) / 2 // morning sleep inertia
  shape -= (0.14 + 0.12 * sleepDebt) * gaussian(h, 14.5, 2.2) // afternoon dip
  shape += 0.06 * gaussian(h, 18.5, 2.0) // evening second wind
  if (h > 20.5) shape -= (h - 20.5) * (0.06 + 0.05 * sleepDebt) // night decline
  return clamp(shape, 0.4, 1.1)
}

/** Saturating caffeine boost (points of alertness), capped ~+16. */
function caffeineBoost(doses: CaffeineDose[], h: number): number {
  const level = caffeineLevelAt(doses, h)
  // Diminishing returns: ~half-max near 90 mg, approaching the cap by ~250 mg.
  return 16 * (1 - Math.pow(0.5, level / 90))
}

export function computeEnergyForecast(input: EnergyForecastInput): EnergyForecast {
  const {
    doses,
    sleepScore,
    recoveryScore,
    activityScore,
    steps,
    activeKcal,
    nowHour,
    fastingHours = 0,
    hydrationRatio = 1,
  } = input

  // Recovery baseline: the readiness model WITHOUT caffeine (caffeine is applied
  // per-hour below as a boost, so it must not also be added here).
  const baseline = computeReadiness({
    sleepScore,
    recoveryScore,
    activityScore,
    caffeineMg: 0,
  }).score

  const sleepDebt = clamp(1 - sleepScore / 100, 0, 1)
  // Heavy movement day → a little more evening tiredness (heuristic, modest).
  const activityLoad = clamp(activeKcal / 700 + steps / 14000, 0, 1.5)
  // Under-hydration drags the whole baseline down a touch (≤5 points).
  const hydrationPenalty = clamp((0.6 - hydrationRatio) / 0.6, 0, 1) * 5
  const effectiveBaseline = baseline - hydrationPenalty

  const samples: { hour: number; energy: number }[] = []
  for (let h = START; h <= END + 1e-6; h += SAMPLE_STEP) {
    const activityFatigue = h > 16 ? (h - 16) * 1.1 * activityLoad : 0
    // A fast beyond target slowly saps later-day energy (≤4 points).
    const fastOver = fastingHours > 0 ? clamp((fastingHours - 14) / 6, 0, 1) : 0
    const fastFatigue = h > 14 ? ((h - 14) / 10) * fastOver * 4 : 0
    const energy = clamp(
      effectiveBaseline * circadian(h, sleepDebt) +
        caffeineBoost(doses, h) -
        activityFatigue -
        fastFatigue,
      0,
      100,
    )
    samples.push({ hour: h, energy })
  }

  const energyAt = (h: number) => {
    const clamped = clamp(h, START, END)
    const i = Math.round((clamped - START) / SAMPLE_STEP)
    return samples[Math.max(0, Math.min(samples.length - 1, i))].energy
  }

  const nowEnergy = Math.round(energyAt(nowHour))
  const slope = energyAt(nowHour + 1) - energyAt(nowHour - 0.5)
  const maxEnergy = Math.max(...samples.map((s) => s.energy))
  const nowState: EnergyForecast['nowState'] =
    nowHour >= 21 ? 'Winding down' : slope > 3 ? 'Peaking' : slope < -3 ? 'Dipping' : 'Steady'

  // Focus windows: forward-looking spans at ≥ 85% of the day's peak.
  const threshold = maxEnergy * 0.85
  const focusWindows: EnergyWindow[] = []
  let open: number | null = null
  for (const s of samples) {
    const eligible = s.hour >= nowHour - 0.5 && s.energy >= threshold
    if (eligible && open === null) open = s.hour
    if (!eligible && open !== null) {
      if (s.hour - open >= 0.75) focusWindows.push({ start: open, end: s.hour })
      open = null
    }
  }
  if (open !== null && END - open >= 0.75) focusWindows.push({ start: open, end: END })

  // Afternoon dip: the lowest sample in the 12–17 window.
  const afternoon = samples.filter((s) => s.hour >= 12 && s.hour <= 17)
  const dipHour = afternoon.length
    ? afternoon.reduce((lo, s) => (s.energy < lo.energy ? s : lo)).hour
    : null

  return {
    samples,
    nowEnergy,
    nowState,
    focusWindows: focusWindows.slice(0, 2),
    dipHour,
    caffeineCutoff: latestCaffeineCutoff(),
  }
}

/**
 * The latest clock time you could take a standard dose and still have caffeine
 * fall below the sleep-disruption threshold by bedtime. Reuses the decay math.
 */
function latestCaffeineCutoff(doseMg = 95): string | null {
  const bed = timeToHours(caffeine.bedtime)
  const halfLife = caffeine.halfLifeHours
  // Solve doseMg · 0.5^((bed − t)/halfLife) = threshold  →  t.
  const hoursBefore = halfLife * Math.log2(doseMg / caffeine.sleepThresholdMg)
  const cutoff = bed - hoursBefore
  if (cutoff < START) return null
  return hoursToTime(cutoff)
}
