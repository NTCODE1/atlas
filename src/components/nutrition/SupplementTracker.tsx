import { useState } from 'react'
import { Loader2, Pill, Plus, X } from 'lucide-react'
import { parseSupplement } from '../../api/supplementAI'
import type { Supplement } from '../../hooks/useSupplements'
import type { MicroAmounts } from '../../micros'

interface SupplementTrackerProps {
  supplements: Supplement[]
  onLog: (name: string, dosage: string, micros?: MicroAmounts) => void
  onDelete: (id: string) => void
}

/** "HH:MM" local time from an ISO timestamp. */
function clockTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Dosage units offered in the picker. */
const DOSE_UNITS = ['mg', 'mcg', 'g', 'IU', 'mL'] as const
type DoseUnit = (typeof DOSE_UNITS)[number]

/** Log a supplement (name + dosage); AI estimates its micronutrient content. */
export default function SupplementTracker({ supplements, onLog, onDelete }: SupplementTrackerProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<DoseUnit>('mg')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const n = name.trim()
    if (!n || saving) return
    setSaving(true)
    const dosage = amount.trim() ? `${amount.trim()} ${unit}` : ''
    // AI estimate; on any failure it returns null and we log without micros.
    const parsed = await parseSupplement(n, dosage)
    onLog(n, dosage, parsed?.micros)
    setName('')
    setAmount('')
    setSaving(false)
  }

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center gap-2">
        <Pill size={18} className="text-accent" strokeWidth={2} />
        <span className="font-display text-lg font-semibold text-text">Supplements</span>
      </div>

      {/* Inputs */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={saving}
          placeholder="e.g. Vitamin D3"
          className="min-w-0 flex-1 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none disabled:opacity-60"
        />
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={saving}
          placeholder="1000"
          aria-label="Dosage amount"
          className="w-20 shrink-0 rounded-2xl border border-border bg-surface-2 px-3 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none disabled:opacity-60"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as DoseUnit)}
          disabled={saving}
          aria-label="Dosage unit"
          className="shrink-0 rounded-2xl border border-border bg-surface-2 px-2 py-3 text-sm text-text focus:outline-none disabled:opacity-60"
        >
          {DOSE_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          aria-label={saving ? 'Estimating…' : 'Log supplement'}
          aria-busy={saving}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border-strong bg-surface-2 text-text-muted transition-colors hover:bg-fill-2 hover:text-text disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : <Plus size={18} strokeWidth={2} />}
        </button>
      </div>

      {/* Logged supplements */}
      {supplements.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {supplements.map((s, i) => (
            <li
              key={s.id}
              className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Pill size={15} strokeWidth={2} className="shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{s.name}</span>
                {s.dosage && <span className="block truncate text-xs text-text-muted">{s.dosage}</span>}
              </div>
              <span className="shrink-0 text-xs text-text-muted">{clockTime(s.createdAt)}</span>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                aria-label={`Delete ${s.name}`}
                className="press grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-fill-2 hover:text-text"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
