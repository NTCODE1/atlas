import type { ReactNode } from 'react'

interface MetricTileProps {
  icon: ReactNode
  label: string
  value: string
  unit?: string
}

/** Compact Home tile: icon + label, then a big value with an optional unit.
 *  Matches the StatTile card idiom but without the sparkline/trend. */
export default function MetricTile({ icon, label, value, unit }: MetricTileProps) {
  return (
    <div className="glass-subtle flex flex-1 flex-col rounded-2xl px-2.5 py-3">
      <div className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 text-text-muted">{icon}</span>
        <span className="truncate whitespace-nowrap text-[10px] font-medium tracking-wider text-text-muted">
          {label}
        </span>
      </div>

      <div className="mt-1.5 flex min-w-0 items-baseline gap-0.5">
        <span className="truncate font-display text-lg font-bold tracking-tight tabular-nums text-text">
          {value}
        </span>
        {unit && <span className="shrink-0 text-xs text-text-muted">{unit}</span>}
      </div>
    </div>
  )
}
