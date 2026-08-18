import { BedDouble, Sunrise } from 'lucide-react'
import { formatClock12, sleep } from '../../data'

interface BedtimeCardProps {
  /** In-bed start, "HH:MM" (defaults to the hard-coded fallback). */
  bedtime?: string
  /** Out-of-bed time, "HH:MM" (defaults to the hard-coded fallback). */
  wakeTime?: string
}

/** Two-up card: bedtime on the left, wake time on the right, split by a divider. */
export default function BedtimeCard({
  bedtime = sleep.bedtime,
  wakeTime = sleep.wakeTime,
}: BedtimeCardProps) {
  return (
    <div className="glass flex items-center rounded-2xl">
      <div className="flex flex-1 items-center gap-3 px-4 py-3.5">
        <BedDouble size={22} strokeWidth={1.75} className="shrink-0 text-indigo" />
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold leading-tight text-text">
            {formatClock12(bedtime)}
          </span>
          <span className="text-xs text-text-muted">Bedtime</span>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 border-l border-border px-4 py-3.5">
        <Sunrise size={22} strokeWidth={1.75} className="shrink-0 text-indigo" />
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold leading-tight text-text">
            {formatClock12(wakeTime)}
          </span>
          <span className="text-xs text-text-muted">Wake time</span>
        </div>
      </div>
    </div>
  )
}
