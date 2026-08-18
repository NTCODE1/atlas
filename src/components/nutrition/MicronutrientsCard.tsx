import { Leaf } from 'lucide-react'
import { MICRO_KEYS, MICRO_META, microPercent, type MicroAmounts } from '../../micros'

interface MicronutrientsCardProps {
  /** Combined micronutrient totals from today's meals + supplements. */
  totals: MicroAmounts
}

/** Round to at most one decimal for compact display. */
function fmt(n: number): string {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
}

/** Micronutrients card: per-nutrient current-vs-RDA bar and percent. */
export default function MicronutrientsCard({ totals }: MicronutrientsCardProps) {
  return (
    <div className="glass flex flex-1 flex-col rounded-3xl px-4 py-4">
      <div className="flex items-center gap-2">
        <Leaf size={16} className="text-accent" strokeWidth={2} />
        <span className="text-sm font-semibold text-text">Micronutrients</span>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {MICRO_KEYS.map((key) => {
          const meta = MICRO_META[key]
          const amount = totals[key] ?? 0
          const percent = microPercent(key, amount)
          return (
            <li key={key} className="flex items-center gap-2.5">
              <span className="w-[68px] shrink-0 truncate text-[13px] text-text-muted">{meta.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(percent, 100)}%`,
                    background: 'linear-gradient(90deg, var(--color-sky), var(--color-accent))',
                    boxShadow: '0 0 6px rgba(255,255,255,0.30)',
                  }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] text-text-muted">
                {fmt(amount)}
                {meta.unit}
              </span>
              <span className="w-9 shrink-0 text-right text-[13px] font-medium text-text">{percent}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
