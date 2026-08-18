import type { GoalType } from '../../settings'

interface GoalStepProps {
  value: GoalType | null
  onChange: (value: GoalType) => void
}

const OPTIONS: { id: GoalType; label: string; hint: string }[] = [
  { id: 'cut', label: 'Cut', hint: 'Lose fat — calorie deficit' },
  { id: 'maintain', label: 'Maintain', hint: 'Stay around your current weight' },
  { id: 'bulk', label: 'Bulk', hint: 'Build muscle — calorie surplus' },
]

export default function GoalStep({ value, onChange }: GoalStepProps) {
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
