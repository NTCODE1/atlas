import { ChevronDown, Flame } from 'lucide-react'
import { nutrition } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import { useNutritionTargets } from '../nutritionTargets'
import { useMeals } from '../hooks/useMeals'
import { useSupplements } from '../hooks/useSupplements'
import { mealTotals, mealMicroTotals } from '../nutrition'
import { sumMicros } from '../micros'
import { useHealth } from '../api/healthContext'
import MacroRing from '../components/nutrition/MacroRing'
import MealTracker from '../components/nutrition/MealTracker'
import MealsList from '../components/nutrition/MealsList'
import HydrationTracker from '../components/nutrition/HydrationTracker'
import SupplementTracker from '../components/nutrition/SupplementTracker'
import MicronutrientsCard from '../components/nutrition/MicronutrientsCard'
import NutritionGapCard from '../components/nutrition/NutritionGapCard'
import FastingCard from '../components/nutrition/FastingCard'
import HydrationAverageCard from '../components/nutrition/HydrationAverageCard'

/** Grams logged today per macro label, aligned to nutrition.macros order. */
const MACRO_GRAMS: Record<string, (t: ReturnType<typeof mealTotals>) => number> = {
  Protein: (t) => t.protein,
  Carbs: (t) => t.carbs,
  Fat: (t) => t.fat,
}

export default function Nutrition() {
  const { health } = useHealth()
  const { todayMeals, addMeal, deleteMeal } = useMeals()
  const { todaySupplements, addSupplement, deleteSupplement } = useSupplements()
  const { targets } = useNutritionTargets()

  const totals = mealTotals(todayMeals)
  const microTotals = sumMicros([
    mealMicroTotals(todayMeals),
    ...todaySupplements.map((s) => s.micros),
  ])
  const consumed = useCountUp(totals.kcal, 1200)

  // Editable per-macro targets (set by the AI goal flow), keyed by ring label.
  const macroTargetFor: Record<string, number> = {
    Protein: targets.protein,
    Carbs: targets.carbs,
    Fat: targets.fat,
  }
  const remaining = Math.max(targets.kcal - totals.kcal, 0)
  const progress = targets.kcal > 0 ? Math.min(totals.kcal / targets.kcal, 1) : 0

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header + calorie hero */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Nutrition</h1>
        <button
          type="button"
          className="mt-0.5 flex items-center gap-1 text-text-muted transition-colors hover:text-text"
        >
          Today
          <ChevronDown size={16} strokeWidth={2} />
        </button>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="num-glow font-display text-[52px] font-bold leading-none text-text">
            {consumed.toLocaleString()}
          </span>
          <span className="text-lg text-text-muted">
            / {targets.kcal.toLocaleString()} {nutrition.unit}
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-fill-2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: 'linear-gradient(90deg, var(--color-accent), var(--color-sky))',
            }}
          />
        </div>
        <span className="mt-2 block text-sm text-text-muted">
          {remaining.toLocaleString()} {nutrition.unit} remaining
        </span>

        {/* Live active energy burned (only shown when synced from the API). */}
        {health.activeEnergyKcal != null && (
          <span className="mt-1 flex items-center gap-1 text-sm text-text-muted">
            <Flame size={14} strokeWidth={2} className="text-accent" />
            {Math.round(health.activeEnergyKcal).toLocaleString()} {nutrition.unit} burned
          </span>
        )}
      </div>

      {/* Macro rings */}
      <div className="card-grad-glass mt-5 flex gap-2 rounded-3xl px-4 py-6">
        {nutrition.macros.map((m) => (
          <MacroRing
            key={m.label}
            label={m.label}
            grams={Math.round(MACRO_GRAMS[m.label]?.(totals) ?? 0)}
            target={macroTargetFor[m.label] ?? m.target}
            color={m.color}
          />
        ))}
      </div>

      {/* Track your meal */}
      <div className="mt-4">
        <MealTracker onLog={addMeal} />
      </div>

      {/* Today's meals */}
      <div className="mt-4">
        <MealsList meals={todayMeals} onDelete={deleteMeal} />
      </div>

      {/* Hydration tracking bar */}
      <HydrationTracker />

      {/* Fasting clock */}
      <FastingCard />

      {/* Supplements */}
      <SupplementTracker
        supplements={todaySupplements}
        onLog={addSupplement}
        onDelete={deleteSupplement}
      />

      {/* Micronutrients (live totals from meals + supplements) */}
      <div className="mt-4">
        <MicronutrientsCard totals={microTotals} />
      </div>

      {/* AI fuel gaps (intake vs targets) */}
      <div className="mt-4">
        <NutritionGapCard />
      </div>

      {/* Weekly hydration average */}
      <HydrationAverageCard />
    </div>
  )
}
