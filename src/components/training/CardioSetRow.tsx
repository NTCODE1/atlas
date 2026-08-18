import { X } from 'lucide-react'
import type { CardioSetEntry } from '../../workouts'

interface CardioSetRowProps {
  index: number
  set: CardioSetEntry
  onChange: (set: CardioSetEntry) => void
  onRemove: () => void
}

/** One editable cardio set: index, distance (km) and duration (min) inputs, remove. */
export default function CardioSetRow({ index, set, onChange, onRemove }: CardioSetRowProps) {
  const num = (raw: string) => Math.max(0, Number(raw) || 0)

  return (
    <div className="glass-subtle flex items-center gap-2 rounded-2xl px-3 py-2">
      <span className="w-6 shrink-0 text-center text-xs font-semibold text-text-muted">
        {index + 1}
      </span>

      <label className="flex flex-1 items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={set.distanceKm || ''}
          placeholder="0.0"
          onChange={(e) => onChange({ ...set, distanceKm: num(e.target.value) })}
          className="w-full rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
        />
        <span className="text-xs text-text-muted">km</span>
      </label>

      <label className="flex flex-1 items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.durationMinutes || ''}
          placeholder="0"
          onChange={(e) => onChange({ ...set, durationMinutes: num(e.target.value) })}
          className="w-full rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
        />
        <span className="text-xs text-text-muted">min</span>
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
