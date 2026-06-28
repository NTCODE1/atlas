import { Droplet } from 'lucide-react'
import { hydration } from '../../data'

/** Hydration card: litres vs goal, droplet progress glyphs, percent of goal. */
export default function HydrationCard() {
  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-border bg-surface px-4 py-4">
      <div className="flex items-center gap-2">
        <Droplet size={16} className="text-mint" fill="var(--color-mint)" strokeWidth={0} />
        <span className="text-sm font-semibold text-text">Hydration</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-text">{hydration.value}</span>
        <span className="text-sm text-text-muted">
          / {hydration.goalLitres} {hydration.unit}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: hydration.total }).map((_, i) => {
          const filled = i < hydration.filled
          return (
            <Droplet
              key={i}
              size={18}
              className={filled ? 'text-mint' : 'text-white/15'}
              fill={filled ? 'var(--color-mint)' : 'none'}
              strokeWidth={filled ? 0 : 1.5}
            />
          )
        })}
      </div>

      <span className="mt-3 text-sm font-medium text-mint">
        {hydration.percent}% of daily goal
      </span>
    </div>
  )
}
