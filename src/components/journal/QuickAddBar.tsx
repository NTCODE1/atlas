import { useRef, useState } from 'react'
import { ArrowUp, Mic } from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { parseCalendar, type ParsedEvent } from '../../api/calendarAI'
import { addJournalEntries, newJournalId } from '../../hooks/useJournalMonth'
import { ENTRY_TAGS } from '../../data'
import { todayISO } from '../../workouts'
import CalendarConfirmSheet from './CalendarConfirmSheet'

/**
 * Inline "what are your plans?" quick-add bar for the Journal screen — free
 * text (or dictated speech) goes straight to the same AI calendar-parse flow
 * the assistant chat uses, then opens the same confirm sheet before writing
 * anything to the calendar.
 */
export default function QuickAddBar() {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [events, setEvents] = useState<ParsedEvent[] | null>(null)
  const [error, setError] = useState(false)

  const dictationBase = useRef('')
  const speech = useSpeechRecognition((transcript) => {
    setDraft(dictationBase.current ? `${dictationBase.current} ${transcript}` : transcript)
  })

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop()
      return
    }
    dictationBase.current = draft.trim()
    speech.start()
  }

  const submit = async () => {
    const text = draft.trim()
    if (!text || pending) return
    if (speech.listening) speech.stop()
    setPending(true)
    setError(false)
    const parsed = await parseCalendar(text, todayISO())
    setPending(false)
    if (parsed && parsed.length > 0) {
      setEvents(parsed)
      setDraft('')
    } else {
      setError(true)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  const commit = (rows: ParsedEvent[]) => {
    addJournalEntries(
      rows.map((e) => ({
        date: e.date,
        entry: {
          id: newJournalId(),
          text: e.title,
          time: e.time,
          tag: ENTRY_TAGS[0],
          kind: e.type,
          ...(e.type === 'task' ? { done: false } : {}),
          important: false,
        },
      })),
    )
    setEvents(null)
  }

  return (
    <div className="mt-4">
      <div className="glass-strong flex items-end gap-2 rounded-[24px] px-4 py-2.5">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(false)
          }}
          onKeyDown={onKey}
          rows={1}
          placeholder="What are your plans?"
          aria-label="Quick-add a calendar event"
          className="max-h-24 flex-1 resize-none self-center bg-transparent py-1.5 text-[15px] text-text placeholder:text-text-muted focus:outline-none"
        />
        {speech.listening ? (
          <button
            type="button"
            onClick={toggleMic}
            aria-label="Stop voice input"
            className="press grid h-9 w-9 shrink-0 animate-pulse place-items-center rounded-full bg-rose text-white"
          >
            <Mic size={18} strokeWidth={2} />
          </button>
        ) : draft.trim() ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            aria-label="Add to calendar"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-bg disabled:opacity-50"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        ) : speech.supported ? (
          <button
            type="button"
            onClick={toggleMic}
            aria-label="Start voice input"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
          >
            <Mic size={18} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {error && (
        <p className="mt-2 px-1 text-xs text-text-muted">
          Couldn't find a date or time in that — try adding one and try again.
        </p>
      )}

      {events && <CalendarConfirmSheet events={events} onConfirm={commit} onClose={() => setEvents(null)} />}
    </div>
  )
}
