import { Check, Utensils, X } from 'lucide-react'
import type { LogMealInput } from '../../api/assistantTools'

interface MealProposalCardProps {
  meal: LogMealInput
  onSave: () => void
  onCancel: () => void
}

/**
 * Inline chat card proposing a meal to log, with its estimated macros. Nothing
 * is saved until the user taps Log. Styled on the assistant's monochrome
 * palette, mirroring TargetsProposalCard/HydrationGoalProposalCard.
 */
export default function MealProposalCard({ meal, onSave, onCancel }: MealProposalCardProps) {
  const macros: { label: string; value: number }[] = [
    { label: 'Protein', value: meal.protein },
    { label: 'Carbs', value: meal.carbs },
    { label: 'Fat', value: meal.fat },
  ]
  return (
    <div className="message-in max-w-[92%] self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] p-4">
      <span className="text-[11px] font-medium tracking-wider text-white/50">
        LOG MEAL · {meal.mealType.toUpperCase()}
      </span>

      <div className="mt-1 flex items-center gap-2">
        <Utensils size={18} strokeWidth={2} className="text-white/70" />
        <span className="text-[15px] font-medium text-white">{meal.name}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-bold text-white">{meal.kcal.toLocaleString()}</span>
        <span className="text-sm text-white/50">kcal</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {macros.map((m) => (
          <div key={m.label} className="rounded-xl bg-white/[0.06] px-3 py-2 text-center">
            <div className="font-display text-lg font-semibold text-white">{m.value}g</div>
            <div className="text-[11px] tracking-wide text-white/50">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-semibold text-[#0a0e1a]"
        >
          <Check size={16} strokeWidth={2.5} />
          Log meal
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="press grid w-11 shrink-0 place-items-center rounded-full border border-white/15 text-white/70 hover:text-white"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
