import { Plus } from 'lucide-react'
import { formatClock12, formatEntryDate, type DayRecord } from '../../data'
import { activityIcon, effectiveActivity } from './activityIcons'

interface EntryListProps {
  entries: { day: number; record: DayRecord }[]
  year: number
  monthIndex: number
  onPick: (day: number) => void
  onAdd: () => void
}

/** Recent journal entries, newest first. Each row taps through to its editor. */
export default function EntryList({ entries, year, monthIndex, onPick, onAdd }: EntryListProps) {
  const sorted = [...entries].sort((a, b) => b.day - a.day)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          RECENT ENTRIES
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add entry for today"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No entries yet — tap a day to add one.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {sorted.map(({ day, record }) => {
            const entry = record.entry!
            const activity = effectiveActivity(record) ?? 'journal'
            const Icon = activityIcon[activity]
            return (
              <button
                key={day}
                type="button"
                onClick={() => onPick(day)}
                className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-4 text-left transition-colors hover:border-accent/30"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-accent text-accent">
                  <Icon size={18} strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-text">
                      {formatEntryDate(year, monthIndex, day)}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatClock12(entry.time)}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] leading-snug text-text">{entry.text}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-xs font-semibold tracking-wide text-accent">
                      {entry.tag}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
