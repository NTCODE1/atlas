import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useSettings } from '../settingsContext'
import { todayISO } from '../workouts'
import { pruneByDate } from '../dataRetention'
import type { CaffeineDose } from '../caffeine'

/** A logged drink (water or beverage) in millilitres. */
export interface Drink {
  id: string
  label: string
  ml: number
  date: string       // YYYY-MM-DD
  createdAt: string  // ISO timestamp
}

/** Default daily hydration goal, in litres (used until the user sets their own). */
export const HYDRATION_GOAL_L = 2.5

const round1 = (n: number) => Math.round(n * 10) / 10
const clampGoal = (l: number) => Math.min(6, Math.max(0.5, round1(l)))

/**
 * The user's editable daily water goal (litres). Backed by `settings.waterGoalL`
 * so the Settings input, every water widget (Home, Nutrition tracker, weekly
 * average), and the assistant all read and write one shared value.
 */
export function useHydrationGoal(): { goalLitres: number; setGoalLitres: (l: number) => void } {
  const { settings, setSettings } = useSettings()
  return {
    goalLitres: settings.waterGoalL,
    setGoalLitres: (l) => setSettings((s) => ({ ...s, waterGoalL: clampGoal(l) })),
  }
}

/** Quick-add presets shown as buttons. */
export const DRINK_PRESETS: { label: string; ml: number }[] = [
  { label: 'Glass', ml: 250 },
  { label: 'Cup', ml: 200 },
  { label: 'Bottle', ml: 500 },
]

/**
 * Hydration persistence, mirroring useMeals: a localStorage list of drinks plus
 * add/delete helpers, a `todayDrinks` view, and today's total in ml.
 */
export function useHydration() {
  const [drinks, setDrinks] = useLocalStorage<Drink[]>('atlas.nutrition.hydration', [])
  // Read-only: caffeinated drinks logged on the Energy screen count toward
  // hydration too, so the whole app shows one connected intake number.
  const [caffeineDoses] = useLocalStorage<CaffeineDose[]>('atlas.caffeine.doses', [])

  // Drinks are a short daily log (HydrationAverageCard only looks back one
  // week) — drop entries older than 7 days rather than keeping them forever.
  useEffect(() => {
    setDrinks((prev) => pruneByDate(prev, todayISO()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addDrink = (label: string, ml: number): Drink => {
    const drink: Drink = {
      id: `dr-${Date.now()}`,
      label: label.trim() || 'Water',
      ml: Math.max(0, Math.round(ml)),
      date: todayISO(),
      createdAt: new Date().toISOString(),
    }
    setDrinks((prev) => [...prev, drink])
    return drink
  }

  const deleteDrink = (id: string) => setDrinks((prev) => prev.filter((d) => d.id !== id))

  const todayDrinks = drinks.filter((d) => d.date === todayISO())
  /** Water/beverages logged on the Nutrition screen. */
  const drinksMl = todayDrinks.reduce((sum, d) => sum + d.ml, 0)
  /** Volume from caffeinated drinks logged on the Energy screen (today only). */
  const caffeineMl = caffeineDoses
    .filter((d) => d.date === todayISO())
    .reduce((sum, d) => sum + (d.ml ?? 0), 0)
  /** Connected daily total across the whole app. */
  const totalMl = drinksMl + caffeineMl

  return { drinks, todayDrinks, drinksMl, caffeineMl, totalMl, addDrink, deleteDrink }
}
