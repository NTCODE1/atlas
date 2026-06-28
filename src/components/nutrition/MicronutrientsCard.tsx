import { Leaf } from 'lucide-react'
import { micronutrients } from '../../data'

/** Micronutrients card: per-nutrient label, thin progress bar, and percent. */
export default function MicronutrientsCard() {
  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-border bg-surface px-4 py-4">
      <div className="flex items-center gap-2">
        <Leaf size={16} className="text-mint" strokeWidth={2} />
        <span className="text-sm font-semibold text-text">Micronutrients</span>
      </div>

      <ul className="mt-3 flex flex-col gap-2.5">
        {micronutrients.map((n) => (
          <li key={n.label} className="flex items-center gap-2">
            <span className="w-20 shrink-0 truncate text-xs text-text-muted">{n.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-mint" style={{ width: `${n.percent}%` }} />
            </div>
            <span className="w-9 shrink-0 text-right text-xs font-medium text-text">
              {n.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
