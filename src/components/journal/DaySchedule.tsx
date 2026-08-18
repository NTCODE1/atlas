import { Circle, CheckCircle2, Plus, Star } from 'lucide-react'
import type { DayRecordV2, DayEntryV2 } from '../../data'

interface DayScheduleProps {
  year: number
  monthIndex: number
  day: number
  isToday: boolean
  record?: DayRecordV2
  onToggleDone: (entryId: string) => void
  onEdit: (entry: DayEntryV2) => void
  onAdd: () => void
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isTask(e: DayEntryV2): boolean {
  return e.kind === 'task'
}

/** Inline "selected day" section: header, event/task counts, and the day's items. */
export default function DaySchedule({
  year,
  monthIndex,
  day,
  isToday,
  record,
  onToggleDone,
  onEdit,
  onAdd,
}: DayScheduleProps) {
  const entries = [...(record?.entries ?? [])].sort((a, b) => a.time.localeCompare(b.time))
  const eventCount = entries.filter((e) => !isTask(e)).length
  const taskCount = entries.filter(isTask).length
  const weekday = WEEKDAY_NAMES[new Date(year, monthIndex, day).getDay()]

  return (
    <div className="glass mt-5 rounded-3xl px-5 py-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-text-muted">
            {isToday ? 'TODAY' : weekday.toUpperCase()}
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num-glow font-display text-3xl font-bold leading-none text-text">{day}</span>
            <span className="text-sm text-text-muted">
              {eventCount} {eventCount === 1 ? 'event' : 'events'} · {taskCount}{' '}
              {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <span className="mt-0.5 block text-sm text-text-muted">{weekday}</span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add event or task"
          className="press grid h-10 w-10 place-items-center rounded-full bg-accent text-bg transition-opacity hover:opacity-90"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Items */}
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">No events or tasks. Tap + to add one.</p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {entries.map((entry, i) => {
            const task = isTask(entry)
            const timeLabel = entry.endTime ? `${entry.time}–${entry.endTime}` : entry.time
            return (
              <li
                key={entry.id}
                className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                {task ? (
                  <button
                    type="button"
                    onClick={() => onToggleDone(entry.id)}
                    aria-label={entry.done ? 'Mark not done' : 'Mark done'}
                    aria-pressed={entry.done}
                    className="press shrink-0 text-text-muted transition-colors hover:text-text"
                  >
                    {entry.done ? (
                      <CheckCircle2 size={20} strokeWidth={2} className="text-accent" />
                    ) : (
                      <Circle size={20} strokeWidth={2} />
                    )}
                  </button>
                ) : (
                  <span className="w-[52px] shrink-0 text-right text-xs font-medium text-text-muted tabular-nums">
                    {entry.time}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="press min-w-0 flex-1 text-left"
                >
                  <span
                    className={`block truncate text-sm font-medium ${
                      task && entry.done ? 'text-text-muted line-through' : 'text-text'
                    }`}
                  >
                    {entry.text}
                  </span>
                  {!task && entry.endTime && (
                    <span className="block truncate text-xs text-text-muted">{timeLabel}</span>
                  )}
                </button>

                {entry.important && (
                  <Star size={15} strokeWidth={2} className="shrink-0 fill-[#ffb155] text-[#ffb155]" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
