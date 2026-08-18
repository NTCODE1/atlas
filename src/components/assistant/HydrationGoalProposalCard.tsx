import { Check, Droplet, X } from 'lucide-react'

interface HydrationGoalProposalCardProps {
  litres: number
  onSave: () => void
  onCancel: () => void
}

/**
 * Inline chat card proposing a new daily water goal. Nothing is saved until the
 * user taps Set. Styled on the assistant's monochrome palette, mirroring
 * TargetsProposalCard.
 */
export default function HydrationGoalProposalCard({
  litres,
  onSave,
  onCancel,
}: HydrationGoalProposalCardProps) {
  return (
    <div className="message-in max-w-[92%] self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] p-4">
      <span className="text-[11px] font-medium tracking-wider text-white/50">PROPOSED WATER GOAL</span>

      <div className="mt-1 flex items-center gap-2">
        <Droplet size={22} strokeWidth={2} className="text-white/70" />
        <span className="font-display text-3xl font-bold text-white">{litres} L</span>
        <span className="text-sm text-white/50">/ day</span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-semibold text-[#0a0e1a]"
        >
          <Check size={16} strokeWidth={2.5} />
          Set water goal
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
