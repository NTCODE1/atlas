import { useState } from 'react'
import { Coffee, Plus, Trash2, X } from 'lucide-react'
import { CAFFEINE_PRESETS, type CaffeineDose } from '../../caffeine'
import { todayISO } from '../../workouts'

interface DoseListProps {
  doses: CaffeineDose[]
  onAdd: (dose: Omit<CaffeineDose, 'id' | 'date'>) => void
  onUpdate: (dose: CaffeineDose) => void
  onDelete: (id: string) => void
}

/** Current wall-clock time as "HH:MM" for pre-filling the form. */
function nowTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function DoseList({ doses, onAdd, onUpdate, onDelete }: DoseListProps) {
  const [open, setOpen] = useState(false)
  // null = adding a new dose; otherwise the id of the dose being edited.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drink, setDrink] = useState('')
  const [time, setTime] = useState(nowTime())
  const [mg, setMg] = useState('80')
  const [ml, setMl] = useState('250')

  const sorted = [...doses].sort((a, b) => a.time.localeCompare(b.time))

  const close = () => {
    setOpen(false)
    setEditingId(null)
    setDrink('')
    setTime(nowTime())
    setMg('80')
    setMl('250')
  }

  const openForAdd = () => {
    setEditingId(null)
    setDrink('')
    setTime(nowTime())
    setMg('80')
    setMl('250')
    setOpen(true)
  }

  const openForEdit = (dose: CaffeineDose) => {
    setEditingId(dose.id)
    setDrink(dose.drink)
    setTime(dose.time)
    setMg(String(dose.mg))
    setMl(dose.ml != null ? String(dose.ml) : '250')
    setOpen(true)
  }

  // Pre-fill name + mg + ml from a preset; time and editability are left untouched.
  const applyPreset = (preset: { drink: string; mg: number; ml: number }) => {
    setDrink(preset.drink)
    setMg(String(preset.mg))
    setMl(String(preset.ml))
  }

  const submit = () => {
    const amount = Number(mg)
    if (!drink.trim() || !Number.isFinite(amount) || amount <= 0) return
    const volume = Number(ml)
    const fields = {
      drink: drink.trim(),
      time,
      mg: Math.round(amount),
      ml: Number.isFinite(volume) && volume > 0 ? Math.round(volume) : 0,
    }
    if (editingId) {
      const original = doses.find((d) => d.id === editingId)
      onUpdate({ id: editingId, date: original?.date ?? todayISO(), ...fields })
    } else {
      onAdd(fields)
    }
    close()
  }

  return (
    <div className="glass rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          TODAY&apos;S DOSES
        </span>
        <button
          type="button"
          onClick={() => (open ? close() : openForAdd())}
          className="press flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {open ? <X size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
          {open ? 'Close' : 'Log drink'}
        </button>
      </div>

      {/* Add / edit form */}
      {open && (
        <div className="glass-subtle mt-3 flex flex-col gap-2 rounded-xl p-3">
          {/* Quick-add presets */}
          <div className="flex flex-wrap gap-1.5">
            {CAFFEINE_PRESETS.map((preset) => (
              <button
                key={preset.drink}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-border bg-bg px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-accent/60 hover:text-text"
              >
                {preset.drink}
                <span className="ml-1 text-accent">{preset.mg}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={drink}
            onChange={(e) => setDrink(e.target.value)}
            placeholder="Drink (e.g. Cortado)"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
            <div className="flex flex-1 items-center rounded-lg border border-border bg-bg px-3 focus-within:border-accent/60">
              <input
                type="number"
                value={mg}
                min={1}
                onChange={(e) => setMg(e.target.value)}
                aria-label="Caffeine (mg)"
                className="w-full bg-transparent py-2 text-sm text-text focus:outline-none"
              />
              <span className="text-xs text-text-muted">mg</span>
            </div>
            <div className="flex flex-1 items-center rounded-lg border border-border bg-bg px-3 focus-within:border-accent/60">
              <input
                type="number"
                value={ml}
                min={0}
                onChange={(e) => setMl(e.target.value)}
                aria-label="Volume (ml)"
                className="w-full bg-transparent py-2 text-sm text-text focus:outline-none"
              />
              <span className="text-xs text-text-muted">ml</span>
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-accent py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            {editingId ? 'Save changes' : 'Add dose'}
          </button>
        </div>
      )}

      {/* Dose rows */}
      <ul className="mt-3 flex flex-col">
        {sorted.length === 0 && (
          <li className="py-3 text-sm text-text-muted">No doses logged yet.</li>
        )}
        {sorted.map((dose, i) => (
          <li
            key={dose.id}
            className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            {/* Tap the dose to edit it */}
            <button
              type="button"
              onClick={() => openForEdit(dose)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Coffee size={15} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-text">{dose.drink}</span>
                <span className="text-xs text-text-muted">{dose.time}</span>
              </div>
              <span className="font-display text-sm font-semibold text-accent">
                {dose.mg}
                <span className="ml-0.5 text-xs font-normal text-text-muted">mg</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(dose.id)}
              aria-label={`Delete ${dose.drink}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
