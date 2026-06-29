import { useState } from 'react'
import { ChevronDown, Flame } from 'lucide-react'
import { meals as seedMeals, nutrition, type Meal, type MealType } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import { useHealth } from '../api/healthContext'
import MacroRing from '../components/nutrition/MacroRing'
import MealTracker from '../components/nutrition/MealTracker'
import MealsList from '../components/nutrition/MealsList'
import WaterCard from '../components/WaterCard'
import MicronutrientsCard from '../components/nutrition/MicronutrientsCard'

export default function Nutrition() {
  const { health } = useHealth()
  const [meals, setMeals] = useState<Meal[]>(seedMeals)
  const consumed = useCountUp(nutrition.consumed, 1200)

  const remaining = Math.max(nutrition.target - nutrition.consumed, 0)
  const progress = Math.min(nutrition.consumed / nutrition.target, 1)

  const logMeal = (type: MealType, name: string) => {
    setMeals((prev) => [...prev, { id: `m-${Date.now()}`, type, name }])
  }

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
            / {nutrition.target.toLocaleString()} {nutrition.unit}
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/8">
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
      <div className="card-grad mt-5 flex gap-2 rounded-3xl border border-border bg-surface px-4 py-6">
        {nutrition.macros.map((m) => (
          <MacroRing
            key={m.label}
            label={m.label}
            grams={m.grams}
            target={m.target}
            color={m.color}
          />
        ))}
      </div>

      {/* Track your meal */}
      <div className="mt-4">
        <MealTracker onLog={logMeal} />
      </div>

      {/* Today's meals */}
      <div className="mt-4">
        <MealsList meals={meals} />
      </div>

      {/* Hydration + Micronutrients */}
      <div className="mt-4 flex gap-3">
        <WaterCard />
        <MicronutrientsCard />
      </div>
    </div>
  )
}
