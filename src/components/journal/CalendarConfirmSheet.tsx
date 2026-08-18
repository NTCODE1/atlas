import { useState } from 'react'
import { CalendarPlus, Trash2 } from 'lucide-react'
import Sheet from '../ui/Sheet'
import type { ParsedEvent } from '../../api/calendarAI'

interface CalendarConfirmSheetProps {
  /** The parsed events to review (a non-empty list). */
  events: ParsedEvent[]
  /** Commit the (possibly edited) events to the calendar. */
  onConfirm: (events: ParsedEvent[]) => void
  onClose: () => void
}

/**
 * Review sheet for AI-parsed calendar events. Each row is editable (title, date,
 * time, event/task) and removable; nothing is written until "Add to calendar".
 */
export default function CalendarConfirmSheet({
  events,
  onConfirm,
  onClose,
}: CalendarConfirmSheetProps) {
  const [rows, setRows] = useState<ParsedEvent[]>(events)

  const update = (i: number, patch: Partial<ParsedEvent>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const valid = rows.filter((r) => r.title.trim() && r.date)

  return (
    <Sheet title="Add to calendar" maxHeight="tall" onClose={onClose}>
      <p className="text-sm text-text-muted">
        Review what I found. Edit or remove anything, then add it to your calendar.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-border bg-fill p-3">
            {/* Event / Task toggle + remove */}
            <div className="flex items-center gap-1.5">
              {(['event', 'task'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => update(i, { type: k })}
                  aria-pressed={row.type === k}
                  className={`press flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
                    row.type === k ? 'bg-accent/20 text-accent' : 'bg-fill-2 text-text-muted'
                  }`}
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove"
                className="press grid h-8 w-9 place-items-center rounded-lg border border-rose/40 bg-rose/10 text-rose transition-colors hover:bg-rose/20"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>

            <input
              value={row.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Title"
              aria-label="Title"
              className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />

            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={row.date}
                onChange={(e) => update(i, { date: e.target.value })}
                aria-label="Date"
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
              <input
                type="time"
                value={row.time}
                onChange={(e) => update(i, { time: e.target.value })}
                aria-label="Time"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
              />
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">Nothing to add.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onConfirm(valid)}
        disabled={valid.length === 0}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <CalendarPlus size={17} strokeWidth={2} />
        Add {valid.length > 0 ? valid.length : ''} to calendar
      </button>
    </Sheet>
  )
}
