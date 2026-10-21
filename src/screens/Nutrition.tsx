import { Flame } from 'lucide-react'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
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
    <div className="flex-1 overflow-y-auto px-5 pb-nav">
      <PageHeader title="Nutrition" subtitle="Today" />

      {/* Calorie + macro hero */}
      <Card variant="hero" className="mt-5 px-5 pb-5 pt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="num-glow text-[40px] font-semibold leading-none tracking-tight text-text tabular-nums">
            {consumed.toLocaleString()}
          </span>
          <span className="text-base text-text-muted">
            / {targets.kcal.toLocaleString()} {nutrition.unit}
          </span>
        </div>
        <ProgressBar value={progress} className="mt-3" />
        <div className="mt-2 flex items-center justify-between text-sm text-text-muted">
          <span>
            {remaining.toLocaleString()} {nutrition.unit} remaining
          </span>
          {/* Live active energy burned (only shown when synced from the API). */}
          {health.activeEnergyKcal != null && (
            <span className="flex items-center gap-1">
              <Flame size={13} strokeWidth={2} />
              {Math.round(health.activeEnergyKcal).toLocaleString()} burned
            </span>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          {nutrition.macros.map((m) => (
            <MacroRing
              key={m.label}
              label={m.label}
              grams={Math.round(MACRO_GRAMS[m.label]?.(totals) ?? 0)}
              target={macroTargetFor[m.label] ?? m.target}
            />
          ))}
        </div>
      </Card>

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
