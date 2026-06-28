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

      <ul className="mt-4 flex flex-col gap-3">
        {micronutrients.map((n) => (
          <li key={n.label} className="flex items-center gap-2.5">
            <span className="w-[68px] shrink-0 truncate text-[13px] text-text-muted">
              {n.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${n.percent}%`,
                  background: 'linear-gradient(90deg,#2bd9ae,#5bffd6)',
                  boxShadow: '0 0 6px rgba(52,245,197,0.45)',
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[13px] font-medium text-text">
              {n.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
