import { Crosshair } from 'lucide-react'
import { deepWork } from '../../data'

/** Deep Work tile: value, goal sub-label, and a thin accent progress bar. */
export default function ProgressTile() {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          DEEP WORK
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-text-muted">
          <Crosshair size={15} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-bold text-text">{deepWork.value}</span>
        <span className="text-xs text-text-muted">{deepWork.unit}</span>
        <span className="ml-1 font-display text-2xl font-bold text-text">
          {deepWork.value2}
        </span>
        <span className="text-xs text-text-muted">{deepWork.unit2}</span>
      </div>

      <span className="mt-0.5 text-xs text-text-muted">{deepWork.goal}</span>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round(deepWork.progress * 100)}%` }}
        />
      </div>
    </div>
  )
}
