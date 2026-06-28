import { ChevronRight, TrendingUp } from 'lucide-react'
import { training } from '../../data'

/** Completed-sessions summary row with a trend chip. */
export default function SessionsSummary() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
        <TrendingUp size={18} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">
          {training.completedSessions} completed sessions this week
        </p>
        <p className="text-xs font-medium text-accent">{training.sessionsTrend} vs last week</p>
      </div>

      <ChevronRight size={20} className="shrink-0 text-text-muted" />
    </button>
  )
}
