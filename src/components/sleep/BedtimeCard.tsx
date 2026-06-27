import { BedDouble, Sunrise } from 'lucide-react'
import { formatClock12, sleep } from '../../data'

/** Two-up card: bedtime on the left, wake time on the right, split by a divider. */
export default function BedtimeCard() {
  return (
    <div className="flex items-center rounded-2xl border border-border bg-surface">
      <div className="flex flex-1 items-center gap-3 px-4 py-3.5">
        <BedDouble size={22} strokeWidth={1.75} className="shrink-0 text-indigo" />
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold leading-tight text-text">
            {formatClock12(sleep.bedtime)}
          </span>
          <span className="text-xs text-text-muted">Bedtime</span>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 border-l border-border px-4 py-3.5">
        <Sunrise size={22} strokeWidth={1.75} className="shrink-0 text-indigo" />
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold leading-tight text-text">
            {formatClock12(sleep.wakeTime)}
          </span>
          <span className="text-xs text-text-muted">Wake time</span>
        </div>
      </div>
    </div>
  )
}
