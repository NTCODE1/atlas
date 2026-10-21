import { useMemo } from 'react'
import { useHealth } from '../api/healthContext'
import { useReadiness } from './useReadiness'
import { mealTotals, mealMicroTotals } from '../nutrition'
import { sumMicros, microPercent, MICRO_KEYS, MICRO_META } from '../micros'
import { sessionVolume, todayISO } from '../workouts'
import { latestEntry, type WeightEntry } from '../weightLog'
import { useNutritionTargets } from '../nutritionTargets'
import { useMeals } from './useMeals'
import { useHydration, HYDRATION_GOAL_L } from './useHydration'
import { useWorkouts } from './useWorkouts'
import { useActivities } from './useActivities'
import { useSupplements } from './useSupplements'
import { readJournalDay, sortEntriesByTime } from './useJournalMonth'
import { useLocalStorage } from './useLocalStorage'
import type { CaffeineDose } from '../caffeine'
import { snapshotList, cutoffDateISO, type SnapshotStore } from '../dailySnapshot'

/** Today's data assembled from every source the app tracks — JSON-serializable
 *  so it can be injected into an AI prompt (data-grounded chat) or mapped to the
 *  briefing metrics. */
export interface TodaySnapshot {
  date: string
  /** Up to the last 7 days before today, most-recent-first, from the local daily-snapshot
   *  history — gives AI tools a trend to reason about instead of just today's numbers. */
  recentDays: {
    date: string
    readiness?: number
    sleepScore?: number
    steps?: number
    restingHr?: number
    sleepTotalMinutes?: number
    trainingLoad?: number
  }[]
  readiness: number
  sleep: {
    score: number
    hours: number | null
    minutes: number | null
    start: string | null
    end: string | null
    deepMinutes: number | null
    remMinutes: number | null
    coreMinutes: number | null
    awakeMinutes: number | null
  }
  hrv: number
  restingHr: number | null
  body: {
    weightKg: number | null
    bmi: number | null
    bodyFatPercentage: number | null
    leanBodyMassKg: number | null
  }
  activity: { steps: number | null; activeKcal: number | null; avgHr: number | null }
  caffeine: { totalMg: number; doses: { drink: string; time: string; mg: number }[] }
  hydration: { litres: number; goalL: number; drinks: number }
  training: {
    loggedToday: boolean
    sessions: { type: string; focus: string | null; minutes: number; rpe: number | null; notes: string | null }[]
    loadKg: number
    exercises: { name: string; sets: number }[]
  }
  nutrition: {
    meals: {
      type: string
      name: string
      kcal: number | null
      protein: number | null
      carbs: number | null
      fat: number | null
    }[]
    totals: { kcal: number; protein: number; carbs: number; fat: number }
    targets: { kcal: number; protein: number; carbs: number; fat: number }
    micros: { name: string; amount: number; target: number; unit: string; pctRda: number }[]
  }
  schedule: {
    time: string
    endTime?: string
    text: string
    kind: 'event' | 'task'
    done?: boolean
    important?: boolean
  }[]
}

/**
 * Assemble today's full data snapshot from the same sources the screens use.
 * Shared by the data-grounded assistant chat and the daily briefing so the
 * assembly lives in one place. Memoized over its reactive inputs.
 */
export function useTodaySnapshot(): TodaySnapshot {
  const { health } = useHealth()
  const { sleepScore, readiness } = useReadiness()
  const { todayMeals } = useMeals()
  const { todaySupplements } = useSupplements()
  const { totalMl, todayDrinks } = useHydration()
  const { todaySessions } = useWorkouts()
  const { activities } = useActivities()
  const { targets } = useNutritionTargets()
  const [caffeineDoses] = useLocalStorage<CaffeineDose[]>('atlas.caffeine.doses', [])
  const [weightEntries] = useLocalStorage<WeightEntry[]>('atlas.weight.entries', [])
  const [snapshotStore] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})

  return useMemo<TodaySnapshot>(() => {
    // Display-only fallback for the AI context payload — not used in any scoring.
    const hrv = health.hrv ?? 68
    const todayCaffeineDoses = caffeineDoses.filter((d) => d.date === todayISO())
    const caffeineTotal = todayCaffeineDoses.reduce((sum, d) => sum + (d.mg ?? 0), 0)

    const today = todayISO()
    const todayActivities = activities.filter((a) => a.date === today)
    const recentCutoff = cutoffDateISO(today, 7)
    const recentDays = snapshotList(snapshotStore)
      .filter((s) => s.date < today && s.date >= recentCutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((s) => ({
        date: s.date,
        ...(s.readiness != null ? { readiness: s.readiness } : {}),
        ...(s.sleepScore != null ? { sleepScore: s.sleepScore } : {}),
        ...(s.steps != null ? { steps: s.steps } : {}),
        ...(s.restingHr != null ? { restingHr: s.restingHr } : {}),
        ...(s.sleepTotalMinutes != null ? { sleepTotalMinutes: s.sleepTotalMinutes } : {}),
        ...(s.trainingLoad != null ? { trainingLoad: s.trainingLoad } : {}),
      }))

    const totals = mealTotals(todayMeals)
    const microTotals = sumMicros([
      mealMicroTotals(todayMeals),
      ...todaySupplements.map((s) => s.micros),
    ])
    const micros = MICRO_KEYS.map((key) => {
      const meta = MICRO_META[key]
      const amount = microTotals[key] ?? 0
      return {
        name: meta.label,
        amount: Math.round(amount * 10) / 10,
        target: meta.rda,
        unit: meta.unit,
        pctRda: microPercent(key, amount),
      }
    })

    // "Calendar" = today's Journal schedule (events + tasks), read non-reactively.
    const schedule = sortEntriesByTime(readJournalDay(new Date()).record?.entries ?? []).map(
      (e) => ({
        time: e.time,
        ...(e.endTime ? { endTime: e.endTime } : {}),
        text: e.text,
        kind: (e.kind === 'task' ? 'task' : 'event') as 'event' | 'task',
        ...(e.done != null ? { done: e.done } : {}),
        ...(e.important ? { important: e.important } : {}),
      }),
    )

    return {
      date: today,
      recentDays,
      readiness: readiness.score,
      sleep: {
        score: sleepScore,
        hours: health.sleepHours,
        minutes: health.sleepMinutes,
        start: health.sleepStart,
        end: health.sleepEnd,
        deepMinutes: health.sleepDeepMinutes,
        remMinutes: health.sleepRemMinutes,
        coreMinutes:
          health.sleepTotalMinutes != null &&
          health.sleepDeepMinutes != null &&
          health.sleepRemMinutes != null &&
          health.sleepAwakeMinutes != null
            ? health.sleepTotalMinutes -
              health.sleepDeepMinutes -
              health.sleepRemMinutes -
              health.sleepAwakeMinutes
            : null,
        awakeMinutes: health.sleepAwakeMinutes,
      },
      hrv: Math.round(hrv),
      restingHr: health.restingHeartRate,
      body: {
        // Prefer the live scale weight; fall back to the latest manual log entry.
        weightKg: health.weightKg ?? latestEntry(weightEntries)?.kg ?? null,
        bmi: health.bmi,
        bodyFatPercentage: health.bodyFatPercentage,
        leanBodyMassKg: health.leanBodyMassKg,
      },
      activity: {
        steps: health.steps,
        activeKcal: health.activeEnergyKcal,
        avgHr: health.averageHeartRate,
      },
      caffeine: {
        totalMg: Math.round(caffeineTotal),
        doses: todayCaffeineDoses.map((d) => ({ drink: d.drink, time: d.time, mg: d.mg })),
      },
      hydration: {
        litres: Math.round((totalMl / 1000) * 10) / 10,
        goalL: HYDRATION_GOAL_L,
        drinks: todayDrinks.length,
      },
      training: {
        loggedToday: todaySessions.length > 0 || todayActivities.length > 0,
        // Ski / trampoline / cardio sessions, so the AI can talk about the real day.
        sessions: todayActivities.map((a) => ({
          type: a.kind,
          focus: a.focus ?? null,
          minutes: a.durationMinutes,
          rpe: a.rpe ?? null,
          notes: a.notes ?? null,
        })),
        loadKg: Math.round(todaySessions.reduce((sum, s) => sum + sessionVolume(s), 0)),
        exercises: todaySessions.flatMap((s) =>
          s.exercises.map((ex) => ({ name: ex.exerciseName, sets: ex.sets.length })),
        ),
      },
      nutrition: {
        meals: todayMeals.map((m) => ({
          type: m.type,
          name: m.name,
          kcal: m.kcal ?? null,
          protein: m.protein ?? null,
          carbs: m.carbs ?? null,
          fat: m.fat ?? null,
        })),
        totals: {
          kcal: Math.round(totals.kcal),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
        },
        targets: {
          kcal: targets.kcal,
          protein: targets.protein,
          carbs: targets.carbs,
          fat: targets.fat,
        },
        micros,
      },
      schedule,
    }
  }, [
    health,
    sleepScore,
    readiness,
    caffeineDoses,
    weightEntries,
    todayMeals,
    todaySupplements,
    totalMl,
    todayDrinks,
    todaySessions,
    activities,
    targets,
    snapshotStore,
  ])
}
