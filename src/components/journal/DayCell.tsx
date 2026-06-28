import type { DayRecord, GridCell } from '../../data'
import { activityIcon, effectiveActivity } from './activityIcons'

interface DayCellProps {
  cell: GridCell
  record?: DayRecord
  onPick: (day: number) => void
}

/** One calendar circle. Active days show a cream icon circle; others a number. */
export default function DayCell({ cell, record, onPick }: DayCellProps) {
  const activity = effectiveActivity(record)
  const marked = cell.isToday || Boolean(record?.entry)

  if (!cell.inMonth) {
    return (
      <div className="grid aspect-square place-items-center">
        <span className="text-sm text-text-muted/40">{cell.day}</span>
      </div>
    )
  }

  const Icon = activity ? activityIcon[activity] : null

  return (
    <button
      type="button"
      onClick={() => onPick(cell.day)}
      aria-label={`${cell.day}${activity ? `, ${activity}` : ''}`}
      className={`relative grid aspect-square place-items-center rounded-full transition-colors ${
        Icon ? 'bg-[#ece7d9] text-bg' : 'bg-surface-2 text-text hover:bg-white/10'
      } ${cell.isToday && !Icon ? 'ring-1 ring-mint/50' : ''}`}
    >
      {Icon ? <Icon size={20} strokeWidth={2} /> : <span className="text-sm">{cell.day}</span>}

      {marked && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-mint ring-2 ring-bg" />
      )}
    </button>
  )
}
