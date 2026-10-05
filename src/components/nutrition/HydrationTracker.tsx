import { useState } from 'react'
import { Droplet, Plus, X } from 'lucide-react'
import { useHydration, useHydrationGoal, DRINK_PRESETS } from '../../hooks/useHydration'

/** Monochrome fill gradient — bright-to-dim grey, no hue. */
const WATER_GRADIENT = 'linear-gradient(90deg, var(--color-accent-bright), var(--color-sky))'

/** "HH:MM" local time from an ISO timestamp. */
function clockTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Hydration bar with quick-add drinks and a logged-drinks list. */
export default function HydrationTracker() {
  const { todayDrinks, totalMl, caffeineMl, addDrink, deleteDrink } = useHydration()
  const { goalLitres } = useHydrationGoal()
  const [custom, setCustom] = useState('')

  const goalMl = goalLitres * 1000
  const litres = totalMl / 1000
  const percent = Math.min(Math.round((totalMl / goalMl) * 100), 100)

  const addCustom = () => {
    const ml = Number(custom)
    if (!Number.isFinite(ml) || ml <= 0) return
    addDrink('Water', ml)
    setCustom('')
  }

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet size={18} className="text-cyan" strokeWidth={2} />
          <span className="font-display text-lg font-semibold text-text">Hydration</span>
        </div>
        <span className="text-sm text-text-muted">
          <span className="font-display font-semibold text-text">{litres.toFixed(2)} L</span> / {goalLitres} L
        </span>
      </div>

      {/* Fill bar */}
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-fill-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%`, background: WATER_GRADIENT, boxShadow: '0 0 8px rgba(255,255,255,0.35)' }}
        />
      </div>
      <span className="mt-2 block text-sm text-text-muted">
        {percent}% of goal
        {caffeineMl > 0 && ` · incl. ${caffeineMl} ml from Energy drinks`}
      </span>

      {/* Quick-add presets + custom ml */}
      <div className="mt-3 flex flex-wrap gap-2">
        {DRINK_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => addDrink(p.label, p.ml)}
            className="press flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            <Plus size={14} strokeWidth={2} />
            {p.label} · {p.ml}ml
          </button>
        ))}
        <div className="flex items-center overflow-hidden rounded-full border border-border bg-surface-2">
          <input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="ml"
            className="w-16 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            aria-label="Add custom amount"
            className="press grid h-9 w-9 place-items-center text-text-muted transition-colors hover:text-text"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Logged drinks */}
      {todayDrinks.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {todayDrinks.map((d, i) => (
            <li
              key={d.id}
              className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Droplet size={15} strokeWidth={2} className="shrink-0 text-cyan" />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{d.label}</span>
              <span className="shrink-0 text-xs text-text-muted">{clockTime(d.createdAt)}</span>
              <span className="shrink-0 text-sm font-medium text-text">{d.ml} ml</span>
              <button
                type="button"
                onClick={() => deleteDrink(d.id)}
                aria-label={`Delete ${d.label}`}
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
