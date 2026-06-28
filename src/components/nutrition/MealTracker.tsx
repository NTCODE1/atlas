import { useState } from 'react'
import { Search, UtensilsCrossed } from 'lucide-react'
import { defaultMealType, type MealType } from '../../data'
import { MEAL_META, MEAL_ORDER } from './mealMeta'

interface MealTrackerProps {
  onLog: (type: MealType, name: string) => void
}

const GRADIENT = 'linear-gradient(90deg,#34f5c5,#8a93ff,#ff6b81)'

/** "Track your meal" card: gradient-glow input + meal-type pills. */
export default function MealTracker({ onLog }: MealTrackerProps) {
  const [text, setText] = useState('')
  const [type, setType] = useState<MealType>(() => defaultMealType())

  const submit = () => {
    const name = text.trim()
    if (!name) return
    onLog(type, name)
    setText('')
  }

  return (
    <div className="rounded-3xl border border-border bg-surface px-5 py-5">
      <div className="flex items-center gap-2">
        <UtensilsCrossed size={18} className="text-mint" strokeWidth={2} />
        <span className="font-display text-lg font-semibold text-text">Track your meal</span>
      </div>

      {/* Gradient-glow input */}
      <div className="relative mt-4">
        <div
          aria-hidden
          className="absolute -inset-0.5 rounded-2xl opacity-70 blur-md"
          style={{ background: GRADIENT }}
        />
        <div className="relative rounded-2xl p-[1.5px]" style={{ background: GRADIENT }}>
          <div className="flex items-center rounded-[15px] bg-bg">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="e.g. 2 eggs, oatmeal, blueberries"
              className="w-full bg-transparent px-4 py-3.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              aria-label="Log meal"
              className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-text transition-colors hover:bg-white/10"
            >
              <Search size={16} strokeWidth={2} />
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
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-mint/40 bg-mint/15 text-mint'
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
