import { useEffect } from 'react'
import { useSyncedStorage } from './useSyncedStorage'
import { todayISO } from '../workouts'
import { pruneByDate } from '../dataRetention'
import type { Meal, MealType } from '../data'
import type { MacroTotals } from '../nutrition'
import type { MicroAmounts } from '../micros'

/** Macros + micros an AI parse (or manual entry) can attach to a new meal. */
export type MealMacros = Partial<Pick<MacroTotals, 'kcal' | 'protein' | 'carbs' | 'fat'>> & {
  micros?: MicroAmounts
}

/**
 * Meal persistence, mirroring useWorkouts: a localStorage-backed list plus
 * add/delete helpers and a `todayMeals` view. Meals are date-stamped so the
 * Nutrition screen can sum just today's entries. Synced through the Worker
 * (see useSyncedStorage.ts / atlas-api/src/sync/nutritionSync.ts's "meals"
 * domain) so logging a meal on one device shows up on another.
 */
export function useMeals() {
  const [meals, setMeals] = useSyncedStorage<Meal[]>('atlas.nutrition.meals', [], 'meals')

  // Meals are a short daily log (only "today" is ever shown) — drop entries
  // older than 7 days rather than keeping them forever.
  useEffect(() => {
    setMeals((prev) => pruneByDate(prev, todayISO()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMeal = (type: MealType, name: string, macros?: MealMacros): Meal => {
    const meal: Meal = {
      id: `m-${Date.now()}`,
      type,
      name: name.trim(),
      date: todayISO(),
      createdAt: new Date().toISOString(),
      ...(macros?.kcal != null ? { kcal: Math.round(macros.kcal) } : {}),
      ...(macros?.protein != null ? { protein: Math.round(macros.protein) } : {}),
      ...(macros?.carbs != null ? { carbs: Math.round(macros.carbs) } : {}),
      ...(macros?.fat != null ? { fat: Math.round(macros.fat) } : {}),
      ...(macros?.micros ? { micros: macros.micros } : {}),
    }
    setMeals((prev) => [...prev, meal])
    return meal
  }

  const deleteMeal = (id: string) => setMeals((prev) => prev.filter((m) => m.id !== id))

  const todayMeals = meals.filter((m) => m.date === todayISO())

  return { meals, todayMeals, addMeal, deleteMeal }
}
