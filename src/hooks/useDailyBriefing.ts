import { useCallback, useEffect, useRef, useState } from 'react'
import { useHealth } from '../api/healthContext'
import { todayISO } from '../workouts'
import { useTodaySnapshot, type TodaySnapshot } from './useTodaySnapshot'
import { useLocalStorage } from './useLocalStorage'
import { getBriefing, type BriefingMetrics } from '../api/briefingAI'

interface CacheEntry {
  brief: string
  generatedAt: string
}

/** Keep only the most recent few days of cached briefs so storage doesn't grow. */
function pruneCache(store: Record<string, CacheEntry>): Record<string, CacheEntry> {
  const keys = Object.keys(store).sort()
  if (keys.length <= 5) return store
  return Object.fromEntries(keys.slice(-5).map((k) => [k, store[k]]))
}

/** Project the shared snapshot down to the flat metrics the briefing prompt wants. */
function toBriefingMetrics(s: TodaySnapshot): BriefingMetrics {
  return {
    readiness: s.readiness,
    sleepScore: s.sleep.score,
    hrv: s.hrv,
    restingHr: s.restingHr,
    caffeineMg: s.caffeine.totalMg,
    hydration: { litres: s.hydration.litres, goalL: s.hydration.goalL },
    training: { todayLoadKg: s.training.loadKg, loggedToday: s.training.loggedToday },
    macros: s.nutrition.totals,
    macroTargets: s.nutrition.targets,
    micros: s.nutrition.micros,
    recentDays: s.recentDays,
  }
}

/**
 * Daily AI briefing: builds today's metrics from the shared `useTodaySnapshot`,
 * asks the Worker for a terse coach brief, and caches it once per day in
 * localStorage. `refresh()` regenerates on demand (overwriting today's entry).
 * The auto-call fires at most once per day, respecting the Worker's daily AI cap.
 */
export function useDailyBriefing() {
  const { loading } = useHealth()
  const snapshot = useTodaySnapshot()
  const [cache, setCache] = useLocalStorage<Record<string, CacheEntry>>('atlas.briefing.cache', {})

  const [loadingBrief, setLoadingBrief] = useState(false)
  const [error, setError] = useState(false)

  const today = todayISO()
  const brief = cache[today]?.brief ?? null

  const generate = useCallback(async () => {
    setLoadingBrief(true)
    setError(false)
    const result = await getBriefing(toBriefingMetrics(snapshot))
    if (result) {
      setCache((prev) =>
        pruneCache({ ...prev, [today]: { brief: result, generatedAt: new Date().toISOString() } }),
      )
    } else {
      setError(true)
    }
    setLoadingBrief(false)
  }, [snapshot, setCache, today])

  // Auto-generate once per day, after health has loaded. The ref guards against
  // re-fires from re-renders / StrictMode double-invoke.
  const triggered = useRef(false)
  useEffect(() => {
    if (loading || triggered.current || cache[today]) return
    triggered.current = true
    void generate()
  }, [loading, cache, today, generate])

  return { brief, loading: loadingBrief, error, refresh: generate }
}
