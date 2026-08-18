/**
 * Nutrition domain helpers — pure functions over the `Meal` model in ./data.
 * State/CRUD lives in ../hooks/useMeals; presentation reads these totals.
 */
import type { Meal } from './data'
import { sumMicros, type MicroAmounts } from './micros'

export interface MacroTotals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const ZERO: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

/** Sum kcal + macros across meals, treating missing fields as 0. */
export function mealTotals(meals: Meal[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      protein: acc.protein + (m.protein ?? 0),
      carbs: acc.carbs + (m.carbs ?? 0),
      fat: acc.fat + (m.fat ?? 0),
    }),
    ZERO,
  )
}

/** Sum micronutrients across meals. */
export function mealMicroTotals(meals: Meal[]): MicroAmounts {
  return sumMicros(meals.map((m) => m.micros))
}
