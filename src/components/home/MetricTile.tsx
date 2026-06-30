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
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface px-3 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">{icon}</span>
        <span className="text-[11px] font-medium tracking-wider text-text-muted">{label}</span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-bold text-text">{value}</span>
        {unit && <span className="text-xs text-text-muted">{unit}</span>}
      </div>
    </div>
  )
}
