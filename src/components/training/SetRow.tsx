import { X } from 'lucide-react'
import type { GymSetEntry } from '../../workouts'

interface SetRowProps {
  index: number
  set: GymSetEntry
  onChange: (set: GymSetEntry) => void
  onRemove: () => void
}

/** One editable set: index, reps and weight inputs, unit label, remove. */
export default function SetRow({ index, set, onChange, onRemove }: SetRowProps) {
  const num = (raw: string) => Math.max(0, Number(raw) || 0)

  return (
    <div className="glass-subtle flex items-center gap-2 rounded-2xl px-3 py-2">
      <span className="w-6 shrink-0 text-center text-xs font-semibold text-text-muted">
        {index + 1}
      </span>

      <label className="flex flex-1 items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.reps || ''}
          placeholder="0"
          onChange={(e) => onChange({ ...set, reps: num(e.target.value) })}
          className="w-full rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
        />
        <span className="text-xs text-text-muted">reps</span>
      </label>

      <label className="flex flex-1 items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={set.weight || ''}
          placeholder="0"
          onChange={(e) => onChange({ ...set, weight: num(e.target.value) })}
          className="w-full rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
        />
        <span className="text-xs text-text-muted">{set.unit}</span>
      </label>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove set ${index + 1}`}
        className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}
