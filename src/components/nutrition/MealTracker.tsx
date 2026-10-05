import { useState } from 'react'
import { Loader2, Search, UtensilsCrossed } from 'lucide-react'
import { defaultMealType, type MealType } from '../../data'
import { parseMeal } from '../../api/nutritionAI'
import type { MealMacros } from '../../hooks/useMeals'
import { MEAL_META, MEAL_ORDER } from './mealMeta'

interface MealTrackerProps {
  onLog: (type: MealType, name: string, macros?: MealMacros) => void
}

const GRADIENT =
  'linear-gradient(100deg, var(--color-border-strong), var(--color-text-muted), var(--color-accent-bright), var(--color-text-muted), var(--color-border-strong))'

/** "Track your meal" card: gradient-glow input + meal-type pills. */
export default function MealTracker({ onLog }: MealTrackerProps) {
  const [text, setText] = useState('')
  const [type, setType] = useState<MealType>(() => defaultMealType())
  const [parsing, setParsing] = useState(false)

  const submit = async () => {
    const name = text.trim()
    if (!name || parsing) return
    setParsing(true)
    // Ask the AI to estimate calories/macros; on any failure we still log the
    // meal (parseMeal resolves to null rather than throwing).
    const parsed = await parseMeal(name)
    const macros: MealMacros | undefined = parsed
      ? {
          kcal: parsed.totalKcal,
          protein: parsed.protein,
          carbs: parsed.carbs,
          fat: parsed.fat,
          micros: parsed.micros,
        }
      : undefined
    onLog(type, name, macros)
    setText('')
    setParsing(false)
  }

  return (
    <div className="glass rounded-3xl px-5 py-5">
      <div className="flex items-center gap-2">
        <UtensilsCrossed size={18} className="text-accent" strokeWidth={2} />
        <span className="font-display text-lg font-semibold text-text">Track your meal</span>
      </div>

      {/* Gradient-glow input */}
      <div className="relative mt-4">
        <div
          aria-hidden
          className="absolute -inset-1 rounded-[20px] opacity-90 blur-lg"
          style={{ background: GRADIENT }}
        />
        <div className="relative rounded-2xl p-[2px]" style={{ background: GRADIENT }}>
          <div className="flex items-center rounded-[14px] bg-bg">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              disabled={parsing}
              placeholder="e.g. 2 eggs, oatmeal, blueberries"
              className="w-full bg-transparent px-4 py-3.5 text-sm text-text placeholder:text-text-muted focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={submit}
              disabled={parsing}
              aria-label={parsing ? 'Estimating…' : 'Log meal'}
              aria-busy={parsing}
              className="press mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border-strong bg-surface-2 text-text-muted transition-colors hover:bg-fill-2 hover:text-text disabled:opacity-70"
            >
              {parsing ? (
                <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              ) : (
                <Search size={16} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meal-type pills */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {MEAL_ORDER.map((t) => {
          const { label, icon: Icon } = MEAL_META[t]
          const selected = t === type
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={selected}
              className={`press flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none ${
                selected
                  ? 'border-accent/70 bg-accent/15 text-accent'
                  : 'border-border bg-surface-2 text-text-muted hover:text-text'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
