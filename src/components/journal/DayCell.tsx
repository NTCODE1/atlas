import { tagColor, type DayRecordV2, type GridCell } from '../../data'
import { ICONS } from '../../icons'

interface DayCellProps {
  cell: GridCell
  record?: DayRecordV2
  selected?: boolean
  onPick: (day: number) => void
  /** Only entries with this tag are shown/counted; 'All' shows everything. */
  filterTag: string
}

const MAX_VISIBLE = 2

/**
 * One calendar tile — a taller rectangular glass card (not a circle) so up to
 * two entry titles can show directly in the grid, each prefixed with a small
 * dot in that entry's tag shade (or amber if flagged important). The day's
 * chosen activity icon, if any, shows small in the top-right corner.
 */
export default function DayCell({ cell, record, selected, onPick, filterTag }: DayCellProps) {
  if (!cell.inMonth) {
    return (
      <div className="flex min-h-[64px] flex-col rounded-xl p-1.5">
        <span className="text-xs text-text-muted/30">{cell.day}</span>
      </div>
    )
  }

  const allEntries = record?.entries ?? []
  const entries = filterTag === 'All' ? allEntries : allEntries.filter((e) => e.tag === filterTag)
  const visible = entries.slice(0, MAX_VISIBLE)
  const overflow = entries.length - visible.length
  const Icon = record?.icon ? ICONS[record.icon] : null

  return (
    <button
      type="button"
      onClick={() => onPick(cell.day)}
      aria-label={`${cell.day}${entries.length ? `, ${entries.length} entries` : ''}${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={`press glass-subtle relative flex min-h-[64px] flex-col items-start gap-0.5 rounded-xl p-1.5 text-left transition-colors hover:bg-fill-2 ${
        selected ? 'ring-2 ring-accent' : cell.isToday ? 'ring-1 ring-accent/50' : ''
      }`}
    >
      <span className={`text-xs font-semibold ${cell.isToday ? 'text-accent' : 'text-text'}`}>
        {cell.day}
      </span>

      {Icon && (
        <span className="absolute right-1.5 top-1.5 text-text-muted">
          <Icon size={11} strokeWidth={2} />
        </span>
      )}

      <div className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
        {visible.map((e) => (
          <span key={e.id} className="flex w-full min-w-0 items-center gap-1">
            <span
              className="h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: e.important ? 'var(--color-rose)' : tagColor(e.tag) }}
            />
            <span className="truncate text-[9px] leading-tight text-text-muted">{e.text}</span>
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[9px] leading-tight text-text-muted/70">+{overflow} more</span>
        )}
      </div>
    </button>
  )
}
