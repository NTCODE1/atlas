import { useState } from 'react'
import { Coffee, Plus, X } from 'lucide-react'
import type { CaffeineDose } from '../../data'

interface DoseListProps {
  doses: CaffeineDose[]
  onAdd: (dose: Omit<CaffeineDose, 'id'>) => void
}

export default function DoseList({ doses, onAdd }: DoseListProps) {
  const [open, setOpen] = useState(false)
  const [drink, setDrink] = useState('')
  const [time, setTime] = useState('12:00')
  const [mg, setMg] = useState('80')

  const sorted = [...doses].sort((a, b) => a.time.localeCompare(b.time))

  const reset = () => {
    setDrink('')
    setTime('12:00')
    setMg('80')
    setOpen(false)
  }

  const submit = () => {
    const amount = Number(mg)
    if (!drink.trim() || !Number.isFinite(amount) || amount <= 0) return
    onAdd({ drink: drink.trim(), time, mg: Math.round(amount) })
    reset()
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          TODAY&apos;S DOSES
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close add dose form' : 'Add a dose'}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
        >
          {open ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Inline add form */}
      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
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
                className="w-full bg-transparent py-2 text-sm text-text focus:outline-none"
              />
              <span className="text-xs text-text-muted">mg</span>
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-accent py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Add dose
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
          </li>
        ))}
      </ul>
    </div>
  )
}
