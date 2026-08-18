import { useMemo } from 'react'
import { useHealth } from '../api/healthContext'
import { useLocalStorage } from './useLocalStorage'
import { useSettings } from '../settingsContext'
import {
  snapshotList,
  restingHrBaseline,
  bedtimeBaseline,
  sleepDebtAverage,
  acwr,
  minutesFromNoon,
  type SnapshotStore,
} from '../dailySnapshot'
import { todayISO } from '../workouts'
import {
  computeSleepScore,
  computeReadiness,
  readinessLabel,
  sleepScoreLabel,
  baselineDeviationScore,
  rangeDeviationScore,
  SLEEP_SCORE,
  type ReadinessResult,
} from '../data'

export interface ReadinessInputs {
  /** Tonight's sleep quality score (duration/architecture/HRV/interruptions/timing). */
  sleepScore: number
  sleepLabel: string
  /** avg(HRV-vs-healthy-range, RHR-vs-baseline). */
  recoveryScore: number
  /** ACWR-derived: recent training strain vs long-term capacity. */
  activityScore: number
  readiness: ReadinessResult
  readinessLabel: string
}

/** Same steep power curve as computeSleepScore's duration component, applied to a multi-night average. */
function sleepDebtScore(avgMinutes: number): number {
  const ratio = Math.min(avgMinutes / SLEEP_SCORE.durationTargetMin, 1)
  return Math.max(0, Math.min(100, Math.round(ratio ** SLEEP_SCORE.durationExponent * 100)))
}

/** ACWR ratio mapped to a 0–100 balance score: at/below 1 is fully balanced, 2+ is maxed-out strain. */
function activityBalanceScore(ratio: number | null): number {
  if (ratio === null) return 100
  if (ratio <= 1) return 100
  if (ratio >= 2) return 0
  return Math.round((2 - ratio) * 100)
}

/**
 * Assembles today's live health + accrued snapshot history into the final
 * sleep/readiness scores — the single "read" path shared by every screen and
 * hook that needs them. `useDailySnapshot` is the "write" path and computes
 * these components independently (it must persist them regardless of whether
 * this hook has run), reusing the same pure formulas from `data.ts` underneath.
 *
 * Acute/chronic ACWR and rolling baselines only look at completed days before
 * today — today's own training/readings don't factor in until tomorrow, so a
 * half-accrued day never skews the ratio.
 */
export function useReadiness(): ReadinessInputs {
  const { health } = useHealth()
  const { settings } = useSettings()
  const [store] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})

  return useMemo(() => {
    const today = todayISO()
    const list = snapshotList(store)

    // --- Tonight's sleep quality ---
    const rhrBaseline = restingHrBaseline(list, today)
    const bedtimeBase = bedtimeBaseline(list, today)
    const bedtimeRaw = health.inBedStart ?? health.sleepStart
    const bedtimeMinutes = bedtimeRaw ? minutesFromNoon(bedtimeRaw) : null

    // No totalMinutes reading for today at all (metric disabled, or genuinely
    // not synced yet) is "unmeasured", not "slept zero minutes" — computing
    // the score with 0 would crater duration AND architecture (both keyed off
    // totalMinutes), unlike every other sub-component here which already
    // falls back to a neutral score when its own input is missing. Matches
    // SLEEP_SCORE.noDataNeutralScore rather than inventing a new constant.
    const tonightScore =
      health.sleepTotalMinutes != null
        ? computeSleepScore({
            totalMinutes: health.sleepTotalMinutes,
            deepMinutes: health.sleepDeepMinutes ?? 0,
            remMinutes: health.sleepRemMinutes ?? 0,
            awakeMinutes: health.sleepAwakeMinutes,
            hrv: health.hrv,
            hrvRangeLowMs: settings.hrvRangeLowMs,
            hrvRangeHighMs: settings.hrvRangeHighMs,
            bedtimeMinutes,
            bedtimeBaseline: bedtimeBase,
          })
        : SLEEP_SCORE.noDataNeutralScore

    // --- Sleep debt (readiness's sleep contributor only — not shown on the Sleep screen) ---
    const debtAvg = sleepDebtAverage(list, today)
    const debtScore = debtAvg !== null ? sleepDebtScore(debtAvg) : tonightScore
    const sleepContributor = Math.round(tonightScore * 0.7 + debtScore * 0.3)

    // --- Recovery / autonomic tone ---
    // HRV: fixed healthy range (no history needed, unlike a rolling baseline) —
    // a reading outside it either direction signals something's off, not just low.
    const hrvScore =
      health.hrv != null
        ? rangeDeviationScore(health.hrv, settings.hrvRangeLowMs, settings.hrvRangeHighMs, 20)
        : SLEEP_SCORE.noDataNeutralScore
    const rhrScore =
      health.restingHeartRate != null && rhrBaseline != null
        ? baselineDeviationScore(health.restingHeartRate, rhrBaseline, 8, 'lowerIsBetter')
        : SLEEP_SCORE.noDataNeutralScore
    const recoveryScore = Math.round((hrvScore + rhrScore) / 2)

    // --- Activity balance (ACWR: 3-day acute vs 28-day chronic training load) ---
    const activityScore = activityBalanceScore(acwr(list, today))

    const readinessResult = computeReadiness({
      sleepScore: sleepContributor,
      recoveryScore,
      activityScore,
      caffeineMg: health.caffeineMg ?? 0,
    })

    return {
      sleepScore: tonightScore,
      sleepLabel: sleepScoreLabel(tonightScore),
      recoveryScore,
      activityScore,
      readiness: readinessResult,
      readinessLabel: readinessLabel(readinessResult.score),
    }
  }, [health, store, settings.hrvRangeLowMs, settings.hrvRangeHighMs])
}
