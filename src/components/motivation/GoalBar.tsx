import { ICONS } from '../../icons'
import {
  goalProgress,
  goalStatus,
  progressDetail,
  STATUS_LABEL,
  type FinanceSavings,
  type Goal,
  type GoalStatus,
} from '../../goals'

interface GoalBarProps {
  goal: Goal
  finance?: FinanceSavings
  onOpen: (goal: Goal) => void
}

const BADGE_CLASS: Record<GoalStatus, string> = {
  completed: 'bg-accent/15 text-accent',
  'deadline-soon': 'bg-[#ffb155]/15 text-[#ffb155]',
  'in-progress': 'bg-fill text-text-muted',
}

/** One goal row: icon + title + status badge, progress bar, percent + detail. */
export default function GoalBar({ goal, finance, onOpen }: GoalBarProps) {
  const Icon = ICONS[goal.icon]
  const progress = goalProgress(goal, finance)
  const pct = Math.round(progress * 100)
  const status = goalStatus(goal, progress)

  return (
    <button
      type="button"
      onClick={() => onOpen(goal)}
      className="press glass-subtle w-full rounded-2xl px-3.5 py-3 text-left"
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} strokeWidth={2} className="shrink-0 text-text" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{goal.title}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-fill">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-text tabular-nums">{pct}%</span>
        <span className="text-xs text-text-muted tabular-nums">{progressDetail(goal, finance)}</span>
      </div>
    </button>
  )
}
