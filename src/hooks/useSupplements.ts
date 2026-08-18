import { useLocalStorage } from './useLocalStorage'
import { todayISO } from '../workouts'
import type { MicroAmounts } from '../micros'

/** A logged supplement with its estimated micronutrient content. */
export interface Supplement {
  id: string
  name: string
  dosage: string
  micros?: MicroAmounts
  date: string       // YYYY-MM-DD
  createdAt: string  // ISO timestamp
}

/**
 * Supplement persistence, mirroring useMeals/useWorkouts: a localStorage list
 * plus add/delete helpers and a `todaySupplements` view. Micros feed the
 * Nutrition micronutrient totals alongside meals.
 */
export function useSupplements() {
  const [supplements, setSupplements] = useLocalStorage<Supplement[]>(
    'atlas.nutrition.supplements',
    [],
  )

  const addSupplement = (name: string, dosage: string, micros?: MicroAmounts): Supplement => {
    const supplement: Supplement = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      date: todayISO(),
      createdAt: new Date().toISOString(),
      ...(micros ? { micros } : {}),
    }
    setSupplements((prev) => [...prev, supplement])
    return supplement
  }

  const deleteSupplement = (id: string) =>
    setSupplements((prev) => prev.filter((s) => s.id !== id))

  const todaySupplements = supplements.filter((s) => s.date === todayISO())

  return { supplements, todaySupplements, addSupplement, deleteSupplement }
}
