import { macroGramsFromSplit } from '../../onboardingCalc'

interface MacroSplit {
  protein: number
  carbs: number
  fat: number
}

interface TargetsStepProps {
  computedKcal: number | null
  kcal: number
  onKcalChange: (kcal: number) => void
  split: MacroSplit
  onSplitChange: (split: MacroSplit) => void
}

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none'

/** Editable calorie estimate (Mifflin-St Jeor × activity, goal-adjusted) plus a % macro split that must total 100. */
export default function TargetsStep({ computedKcal, kcal, onKcalChange, split, onSplitChange }: TargetsStepProps) {
  const total = split.protein + split.carbs + split.fat
  const grams = macroGramsFromSplit(kcal, split)

  const patchSplit = (field: keyof MacroSplit, raw: string) => {
    const v = Math.max(0, Math.round(Number(raw) || 0))
    onSplitChange({ ...split, [field]: v })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-subtle rounded-2xl p-4">
        <span className="text-xs text-text-muted">
          {computedKcal !== null
            ? `Estimated from your profile: ${computedKcal.toLocaleString()} kcal/day`
            : 'Daily calorie target'}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          value={kcal}
          onChange={(e) => onKcalChange(Number(e.target.value) || 0)}
          className={`${inputClass} mt-2 font-display text-lg font-bold`}
        />
      </div>

      <div className="glass-subtle rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-text-muted">Macro split (%)</span>
          <span className={`text-xs font-semibold ${total === 100 ? 'text-text-muted' : 'text-rose'}`}>
            {total}% {total === 100 ? '' : '(must total 100%)'}
          </span>
        </div>
        <div className="mt-3 flex gap-3">
          <MacroField label="Protein" grams={grams.protein} value={split.protein} onChange={(v) => patchSplit('protein', v)} />
          <MacroField label="Carbs" grams={grams.carbs} value={split.carbs} onChange={(v) => patchSplit('carbs', v)} />
          <MacroField label="Fat" grams={grams.fat} value={split.fat} onChange={(v) => patchSplit('fat', v)} />
        </div>
      </div>
    </div>
  )
}

function MacroField({
  label,
  grams,
  value,
  onChange,
}: {
  label: string
  grams: number
  value: number
  onChange: (raw: string) => void
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      <span className="text-[11px] text-text-muted">{grams}g</span>
    </label>
  )
}
