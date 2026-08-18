import type { UnitSystem } from './UnitsStep'

interface BodyStepProps {
  unit: UnitSystem
  age: number | null
  heightCm: number | null
  weightKg: number | null
  onChange: (patch: { age?: number | null; heightCm?: number | null; weightKg?: number | null }) => void
}

const CM_PER_IN = 2.54
const KG_PER_LB = 0.45359237

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none'

/** Collects age, height, and weight; height/weight are converted to cm/kg for storage regardless of display unit. */
export default function BodyStep({ unit, age, heightCm, weightKg, onChange }: BodyStepProps) {
  const feet = heightCm !== null ? Math.floor(heightCm / CM_PER_IN / 12) : null
  const inches = heightCm !== null ? Math.round((heightCm / CM_PER_IN) % 12) : null
  const weightLb = weightKg !== null ? Math.round((weightKg / KG_PER_LB) * 10) / 10 : null

  const setFeetInches = (ft: number | null, inch: number | null) => {
    if (ft === null && inch === null) return onChange({ heightCm: null })
    const totalIn = (ft ?? 0) * 12 + (inch ?? 0)
    onChange({ heightCm: Math.round(totalIn * CM_PER_IN) })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Age">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={age ?? ''}
          placeholder="—"
          onChange={(e) => onChange({ age: numberOrNull(e.target.value) })}
          className={inputClass}
        />
      </Field>

      {unit === 'metric' ? (
        <Field label="Height (cm)">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={heightCm ?? ''}
            placeholder="—"
            onChange={(e) => onChange({ heightCm: numberOrNull(e.target.value) })}
            className={inputClass}
          />
        </Field>
      ) : (
        <div className="flex gap-3">
          <Field label="Height (ft)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={feet ?? ''}
              placeholder="—"
              onChange={(e) => setFeetInches(numberOrNull(e.target.value), inches)}
              className={inputClass}
            />
          </Field>
          <Field label="Height (in)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              value={inches ?? ''}
              placeholder="—"
              onChange={(e) => setFeetInches(feet, numberOrNull(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <Field label={unit === 'metric' ? 'Weight (kg)' : 'Weight (lb)'}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={unit === 'metric' ? (weightKg ?? '') : (weightLb ?? '')}
          placeholder="—"
          onChange={(e) => {
            const v = numberOrNull(e.target.value)
            onChange({ weightKg: v === null ? null : unit === 'metric' ? v : v * KG_PER_LB })
          }}
          className={inputClass}
        />
      </Field>
    </div>
  )
}

const numberOrNull = (raw: string) => {
  const v = Number(raw)
  return raw.trim() === '' || !Number.isFinite(v) ? null : v
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  )
}
