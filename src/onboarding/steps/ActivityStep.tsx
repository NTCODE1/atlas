import type { ActivityLevel } from '../../settings'

interface ActivityStepProps {
  value: ActivityLevel | null
  onChange: (value: ActivityLevel) => void
}

const OPTIONS: { id: ActivityLevel; label: string; hint: string }[] = [
  { id: 'sedentary', label: 'Sedentary', hint: 'Little to no exercise, desk job' },
  { id: 'light', label: 'Light', hint: 'Light exercise 1–3 days/week' },
  { id: 'moderate', label: 'Moderate', hint: 'Moderate exercise 3–5 days/week' },
  { id: 'active', label: 'Active', hint: 'Hard exercise 6–7 days/week' },
  { id: 'very_active', label: 'Very active', hint: 'Physical job or 2x/day training' },
]

/** Vertical radio-style list — five options with descriptions don't fit a SegmentedControl pill row. */
export default function ActivityStep({ value, onChange }: ActivityStepProps) {
  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`press glass-subtle flex flex-col rounded-2xl px-4 py-3 text-left transition-colors ${
              active ? 'border-accent/60 bg-accent/10' : ''
            }`}
          >
            <span className={`text-sm font-semibold ${active ? 'text-accent' : 'text-text'}`}>
              {opt.label}
            </span>
            <span className="text-xs text-text-muted">{opt.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
