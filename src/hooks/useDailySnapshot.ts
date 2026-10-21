import { useEffect } from 'react'
import { useHealth } from '../api/healthContext'
import { useLocalStorage } from './useLocalStorage'
import { useSyncedStorage } from './useSyncedStorage'
import { useWorkouts } from './useWorkouts'
import { useActivities } from './useActivities'
import { useWatchWorkouts } from '../api/workoutContext'
import { useReadiness } from './useReadiness'
import { activity, hydration } from '../data'
import { dateISO } from '../habits'
import { latestEntry, type WeightEntry } from '../weightLog'
import type { CaffeineDose } from '../caffeine'
import {
  upsertToday,
  pruneSnapshotStore,
  dailyTrainingLoad,
  minutesFromNoon,
  type DailySnapshot,
  type SnapshotStore,
} from '../dailySnapshot'

/**
 * Persists one snapshot per day of the dashboard's key metrics, so future
 * history features — including the readiness/sleep baselines in
 * useReadiness.ts — have data to draw on. Runs once the health fetch settles
 * and merges into today's record (idempotent per day). Single owner of the
 * store. hrv/restingHr are persisted as the *raw* live reading (undefined when
 * not live) rather than a fallback-substituted value, so rolling baselines
 * only ever average real readings. Synced through the Worker (see
 * useSyncedStorage.ts / atlas-api/src/sync/snapshotSync.ts's
 * "dailySnapshots" domain) so a device that's had this rebuilding locally
 * doesn't lose its rolling baselines just for being the "other" device.
 */
export function useDailySnapshot(): void {
  const { health, loading } = useHealth()
  const [, setStore] = useSyncedStorage<SnapshotStore>('atlas.snapshots', {}, 'dailySnapshots')
  // Weight is logged separately; read (don't own) the latest entry for today.
  const [weightEntries] = useLocalStorage<WeightEntry[]>('atlas.weight.entries', [])
  // Caffeine is logged separately too; read (don't own) today's doses for the
  // real intake total — health.caffeineMg is a different, unused Apple Health
  // metric, not what the Energy screen actually logs.
  const [caffeineDoses] = useLocalStorage<CaffeineDose[]>('atlas.caffeine.doses', [])
  const { sessions } = useWorkouts()
  const { activities } = useActivities()
  const { workouts } = useWatchWorkouts()
  const { sleepScore, readiness } = useReadiness()

  useEffect(() => {
    if (loading) return

    const today = dateISO()
    const todaysWeight = latestEntry(weightEntries)
    const bedtimeRaw = health.inBedStart ?? health.sleepStart
    const bedtimeMinutes = bedtimeRaw ? (minutesFromNoon(bedtimeRaw) ?? undefined) : undefined
    const todayCaffeineMg = caffeineDoses
      .filter((d) => d.date === today)
      .reduce((sum, d) => sum + (d.mg ?? 0), 0)

    const snap: DailySnapshot = {
      date: today,
      readiness: readiness.score,
      sleepScore,
      // Prefer the live scale weight (Apple Health) so prior days stay comparable
      // to the live value; fall back to today's manual log entry.
      weightKg: health.weightKg ?? (todaysWeight?.date === today ? todaysWeight.kg : undefined),
      bodyFatPercentage: health.bodyFatPercentage ?? undefined,
      bmi: health.bmi ?? undefined,
      leanBodyMassKg: health.leanBodyMassKg ?? undefined,
      steps: health.steps ?? activity.steps,
      activeKcal: Math.round(health.activeEnergyKcal ?? activity.activeKcal),
      hrv: health.hrv ?? undefined,
      restingHr: health.restingHeartRate ?? undefined,
      caffeineMg: todayCaffeineMg > 0 ? todayCaffeineMg : undefined,
      hydrationLitres: health.hydrationLitres ?? Number(hydration.value),
      sleepTotalMinutes: health.sleepTotalMinutes ?? undefined,
      sleepDeepMinutes: health.sleepDeepMinutes ?? undefined,
      sleepRemMinutes: health.sleepRemMinutes ?? undefined,
      sleepAwakeMinutes: health.sleepAwakeMinutes ?? undefined,
      bedtimeMinutes,
      trainingLoad: dailyTrainingLoad(sessions, workouts, today, activities),
    }

    // Merge today's snapshot in, then enforce retention: full records past 7
    // days are slimmed to just what the rolling baselines need, and anything
    // past 60 days is dropped (see dailySnapshot.ts pruneSnapshotStore).
    setStore((prev) => pruneSnapshotStore(upsertToday(prev, snap), today))
    // Re-run when the health payload settles, today's weight/caffeine changes,
    // or today's training/readiness inputs change.
  }, [loading, health, weightEntries, caffeineDoses, sessions, workouts, activities, sleepScore, readiness, setStore])
}
