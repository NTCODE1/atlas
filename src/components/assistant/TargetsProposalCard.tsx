import { Check, Lightbulb, X } from 'lucide-react'
import type { ProposedTargets } from '../../api/targetsAI'

interface TargetsProposalCardProps {
  targets: ProposedTargets
  onSave: () => void
  onCancel: () => void
}

/**
 * Inline chat card proposing new calorie/macro targets from a stated goal.
 * Nothing is saved until the user taps Save. Styled on the assistant's dark
 * monochrome palette so it reads as an assistant-side message.
 */
export default function TargetsProposalCard({ targets, onSave, onCancel }: TargetsProposalCardProps) {
  const macros: { label: string; value: number }[] = [
    { label: 'Protein', value: targets.protein },
    { label: 'Carbs', value: targets.carbs },
    { label: 'Fat', value: targets.fat },
  ]
  return (
    <div className="message-in max-w-[92%] self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] p-4">
      <span className="text-[11px] font-medium tracking-wider text-white/50">PROPOSED TARGETS</span>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-bold text-white">
          {targets.calorieTarget.toLocaleString()}
        </span>
        <span className="text-sm text-white/50">kcal / day</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {macros.map((m) => (
          <div key={m.label} className="rounded-xl bg-white/[0.06] px-3 py-2 text-center">
            <div className="font-display text-lg font-semibold text-white">{m.value}g</div>
            <div className="text-[11px] tracking-wide text-white/50">{m.label}</div>
          </div>
        ))}
      </div>

      {targets.reasoning && (
        <p className="mt-3 text-sm leading-relaxed text-white/80">{targets.reasoning}</p>
      )}

      {targets.tips.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {targets.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
              <Lightbulb size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-sky" />
              {tip}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-semibold text-[#0a0e1a]"
        >
          <Check size={16} strokeWidth={2.5} />
          Save targets
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
