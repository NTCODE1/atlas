import { Droplet, Droplets } from 'lucide-react'
import { hydration } from '../../data'

/** Hydration tile: value, goal, and a row of droplet glyphs (filled vs empty). */
export default function HydrationTile() {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          HYDRATION
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-text-muted">
          <Droplets size={15} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-bold text-text">{hydration.value}</span>
        <span className="text-xs text-text-muted">{hydration.unit}</span>
      </div>

      <span className="mt-0.5 text-xs text-text-muted">{hydration.goal}</span>

      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: hydration.total }).map((_, i) => {
          const filled = i < hydration.filled
          return (
            <Droplet
              key={i}
              size={16}
              className={filled ? 'text-accent' : 'text-white/15'}
              fill={filled ? 'var(--color-accent)' : 'none'}
              strokeWidth={filled ? 0 : 1.5}
            />
          )
        })}
      </div>
    </div>
  )
}
