import { useCallback, useEffect, useRef, useState } from 'react'
import { todayISO } from '../workouts'
import { useTodaySnapshot } from './useTodaySnapshot'
import { useLocalStorage } from './useLocalStorage'
import { getNutritionGaps, type NutritionGap } from '../api/nutritionGapAI'

interface CacheEntry {
  gaps: NutritionGap[]
  generatedAt: string
}

/** Keep only the most recent few days of cached gaps so storage doesn't grow. */
function pruneCache(store: Record<string, CacheEntry>): Record<string, CacheEntry> {
  const keys = Object.keys(store).sort()
  if (keys.length <= 5) return store
  return Object.fromEntries(keys.slice(-5).map((k) => [k, store[k]]))
}

/**
 * Today's nutrition gaps: reads the shared `useTodaySnapshot().nutrition`, asks
 * the Worker for the largest intake-vs-target gaps + food fixes, and caches the
 * result once per day. Auto-generates once per day only when at least one meal is
 * logged; `refresh()` regenerates on demand (e.g. after logging more).
 */
export function useNutritionGaps() {
  const { nutrition } = useTodaySnapshot()
  const [cache, setCache] = useLocalStorage<Record<string, CacheEntry>>(
    'atlas.nutritionGap.cache',
    {},
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const today = todayISO()
  const gaps = cache[today]?.gaps ?? null
  const hasMeals = nutrition.meals.length > 0

  const generate = useCallback(async () => {
    setLoading(true)
    setError(false)
    const result = await getNutritionGaps(nutrition)
    if (result) {
      setCache((prev) =>
        pruneCache({ ...prev, [today]: { gaps: result, generatedAt: new Date().toISOString() } }),
      )
    } else {
      setError(true)
    }
    setLoading(false)
  }, [nutrition, setCache, today])

  // Auto-generate once per day, only once meals exist. Ref guards re-fires.
  const triggered = useRef(false)
  useEffect(() => {
    if (triggered.current || !hasMeals || cache[today]) return
    triggered.current = true
    void generate()
  }, [hasMeals, cache, today, generate])

  return { gaps, loading, error, hasMeals, refresh: generate }
}
