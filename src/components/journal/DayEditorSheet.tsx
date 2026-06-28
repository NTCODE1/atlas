import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { ENTRY_TAGS, formatEntryDate, type DayRecord, type JournalActivity } from '../../data'
import { ACTIVITIES, ACTIVITY_LABEL, activityIcon } from './activityIcons'

interface DayEditorSheetProps {
  year: number
  monthIndex: number
  day: number
  record?: DayRecord
  onSave: (day: number, rec: DayRecord) => void
  onDelete: (day: number) => void
  onClose: () => void
}

/** Bottom-sheet editor: set a day's activity, write/edit its journal entry, or clear it. */
export default function DayEditorSheet({
  year,
  monthIndex,
  day,
  record,
  onSave,
  onDelete,
  onClose,
}: DayEditorSheetProps) {
  const [activity, setActivity] = useState<JournalActivity | undefined>(record?.activity)
  const [text, setText] = useState(record?.entry?.text ?? '')
  const [time, setTime] = useState(record?.entry?.time ?? '09:00')
  const [tag, setTag] = useState(record?.entry?.tag ?? ENTRY_TAGS[0])

  const hasContent = Boolean(record?.activity || record?.entry)

  const save = () => {
    const trimmed = text.trim()
    const rec: DayRecord = {
      activity,
      entry: trimmed ? { text: trimmed, time, tag } : undefined,
    }
    if (!rec.activity && !rec.entry) {
      onDelete(day)
    } else {
      onSave(day, rec)
    }
    onClose()
  }

  const remove = () => {
    onDelete(day)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-t-3xl border-t border-border bg-surface px-5 pb-7 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.75rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text">
            {formatEntryDate(year, monthIndex, day)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-text-muted hover:text-text"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Activity picker */}
        <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
          ACTIVITY
        </span>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {ACTIVITIES.map((a) => {
            const Icon = activityIcon[a]
            const selected = activity === a
            return (
              <button
                key={a}
                type="button"
                onClick={() => setActivity(selected ? undefined : a)}
                aria-label={ACTIVITY_LABEL[a]}
                aria-pressed={selected}
                className={`grid aspect-square place-items-center rounded-xl border transition-colors ${
                  selected
                    ? 'border-mint/40 bg-mint/15 text-mint'
                    : 'border-border bg-surface-2 text-text-muted hover:text-text'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
              </button>
            )
          })}
        </div>

        {/* Entry editor */}
        <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
          JOURNAL ENTRY
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="What happened today?"
          className="mt-2 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-mint/60 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-mint/60 focus:outline-none"
          />
          <div className="flex flex-1 flex-wrap justify-end gap-1.5">
            {ENTRY_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
                  tag === t ? 'bg-orange/20 text-orange' : 'bg-white/5 text-text-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-lg bg-mint py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Save
          </button>
          {hasContent && (
            <button
              type="button"
              onClick={remove}
              aria-label="Delete day"
              className="grid w-12 place-items-center rounded-lg border border-rose/40 bg-rose/10 text-rose transition-colors hover:bg-rose/20"
            >
              <Trash2 size={17} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
