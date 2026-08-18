import { Flame } from 'lucide-react'
import { bestStreak, lastDays, streak, type HabitChecks, type HabitDef } from '../../habits'
import { ICONS } from '../../icons'
import Sheet from '../ui/Sheet'

interface HabitHistorySheetProps {
  habits: HabitDef[]
  checks: HabitChecks
  onClose: () => void
}

/** Per-habit history: current + best streak and a 30-day dot grid. */
export default function HabitHistorySheet({ habits, checks, onClose }: HabitHistorySheetProps) {
  return (
    <Sheet title="Habit history" maxHeight="tall" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {habits.map((habit) => {
          const Icon = ICONS[habit.icon]
          const current = streak(checks, habit.id)
          const best = bestStreak(checks, habit.id)
          const days = lastDays(checks, habit.id, 30)
          return (
            <div key={habit.id} className="glass-subtle rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{habit.name}</span>
                  <span className="text-xs text-text-muted">best {best}d</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 font-display text-lg font-bold text-accent">
                  <Flame size={15} strokeWidth={2} />
                  {current}
                  <span className="text-xs font-normal text-text-muted">d</span>
                </span>
              </div>

              {/* Last 30 days, oldest → today */}
              <div className="mt-3 grid grid-cols-15 gap-1">
                {days.map((checked, i) => (
                  <span
                    key={i}
                    className={`aspect-square rounded-[3px] ${
                      checked ? 'bg-accent' : 'bg-fill-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {habits.length === 0 && (
          <p className="text-sm text-text-muted">No habits to show yet.</p>
        )}
      </div>
    </Sheet>
  )
}
