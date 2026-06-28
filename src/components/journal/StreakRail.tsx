import { Check, Flame } from 'lucide-react'

export type WeekStatus = 'done' | 'current' | 'future'

interface StreakRailProps {
  statuses: WeekStatus[]
  streak: number
}

/**
 * Vertical orange rail beside the calendar — one slot per week row. Completed
 * weeks show a checkmark, the current week shows the flame + streak count, and
 * future weeks are dim. The leading spacer offsets the weekday header so slots
 * line up with their rows.
 */
export default function StreakRail({ statuses, streak }: StreakRailProps) {
  return (
    <div className="flex w-9 flex-col self-stretch">
      <div className="h-[26px] shrink-0" />
      <div className="flex flex-1 flex-col items-center justify-around rounded-full bg-orange/12 py-3">
        {statuses.map((status, i) => {
          if (status === 'current') {
            return (
              <div key={i} className="relative grid place-items-center">
                <Flame size={34} className="text-orange" fill="currentColor" />
                <span className="absolute pt-1 text-[11px] font-bold text-bg">{streak}</span>
              </div>
            )
          }
          if (status === 'done') {
            return (
              <div key={i} className="grid h-7 w-7 place-items-center rounded-full bg-orange">
                <Check size={16} strokeWidth={3} className="text-white" />
              </div>
            )
          }
          return <span key={i} className="h-2.5 w-2.5 rounded-full bg-white/10" />
        })}
      </div>
    </div>
  )
}
