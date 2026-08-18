import { useState } from 'react'
import { ChevronLeft, Star, Trash2 } from 'lucide-react'
import { ENTRY_TAGS, type DayEntryV2 } from '../../data'

interface EntryEditorProps {
  /** Existing entry to edit, or undefined to create a new one. */
  entry?: DayEntryV2
  /** Pre-filled time for new entries (e.g. the tapped hour slot). */
  defaultTime?: string
  onSave: (entry: DayEntryV2) => void
  onDelete: (id: string) => void
  onBack: () => void
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** Single-entry form: text, time, tag, importance. Renders inside DayViewSheet. */
export default function EntryEditor({
  entry,
  defaultTime = '09:00',
  onSave,
  onDelete,
  onBack,
}: EntryEditorProps) {
  const [text, setText] = useState(entry?.text ?? '')
  const [time, setTime] = useState(entry?.time ?? defaultTime)
  const [endTime, setEndTime] = useState(entry?.endTime ?? '')
  const [tag, setTag] = useState(entry?.tag ?? ENTRY_TAGS[0])
  const [kind, setKind] = useState<'event' | 'task'>(entry?.kind ?? 'event')
  const [important, setImportant] = useState(entry?.important ?? false)

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) {
      if (entry) onDelete(entry.id)
      onBack()
      return
    }
    onSave({
      id: entry?.id ?? newId(),
      text: trimmed,
      time,
      ...(kind === 'event' && endTime ? { endTime } : {}),
      tag,
      kind,
      done: entry?.done ?? false,
      important,
    })
    onBack()
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="press -ml-1 flex items-center gap-0.5 text-sm font-medium text-text-muted hover:text-text"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        Day view
      </button>

      <span className="mt-4 block text-[11px] font-medium tracking-wider text-text-muted">
        {entry ? 'EDIT ENTRY' : 'NEW ENTRY'}
      </span>

      {/* Event / Task toggle */}
      <div className="mt-2 flex gap-1.5">
        {(['event', 'task'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`press flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
              kind === k ? 'bg-accent/20 text-accent' : 'bg-fill text-text-muted'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        placeholder="What happened?"
        className="mt-2 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Start time"
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
        />
        {kind === 'event' && (
          <>
            <span className="text-sm text-text-muted">–</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-label="End time"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
          </>
        )}
        <div className="flex flex-1 flex-wrap justify-end gap-1.5">
          {ENTRY_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`press rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
                tag === t ? 'bg-accent/20 text-accent' : 'bg-fill text-text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Importance flag */}
      <button
        type="button"
        onClick={() => setImportant((v) => !v)}
        aria-pressed={important}
        className={`press mt-3 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
          important
            ? 'border-[#ffb155]/40 bg-[#ffb155]/10'
            : 'border-border bg-fill'
        }`}
      >
        <Star
          size={17}
          strokeWidth={2}
          className={important ? 'fill-[#ffb155] text-[#ffb155]' : 'text-text-muted'}
        />
        <span className={`text-sm font-medium ${important ? 'text-[#ffb155]' : 'text-text-muted'}`}>
          Important
        </span>
        <span className="ml-auto text-xs text-text-muted">
          {important ? 'Will be flagged' : 'Off'}
        </span>
      </button>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={save}
          className="press flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Save
        </button>
        {entry && (
          <button
            type="button"
            onClick={() => {
              onDelete(entry.id)
              onBack()
            }}
            aria-label="Delete entry"
            className="press grid w-12 place-items-center rounded-lg border border-rose/40 bg-rose/10 text-rose transition-colors hover:bg-rose/20"
          >
            <Trash2 size={17} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
