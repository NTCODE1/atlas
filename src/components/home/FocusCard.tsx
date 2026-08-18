import { useState } from 'react'
import { Target } from 'lucide-react'
import { useTodaysFocus } from '../../hooks/useTodaysFocus'
import { formatClock12 } from '../../data'
import FocusPickerSheet from './FocusPickerSheet'

/** Highlighted accent-tinted "Today's Focus" card — tap to pick one of today's
 *  journal tasks/events as your focus, or clear it back to empty. */
export default function FocusCard() {
  const { entries, focusEntry, setFocusEntryId } = useTodaysFocus()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="press flex w-full items-center justify-between rounded-2xl border border-accent/25 bg-accent/[0.07] px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-wider text-accent">
            TODAY'S FOCUS
          </span>
          {focusEntry ? (
            <>
              <h3 className="mt-1 truncate font-display text-xl font-bold text-text">
                {focusEntry.text}
              </h3>
              <span className="mt-2 inline-block rounded-full bg-fill px-2.5 py-1 text-xs text-text-muted">
                {formatClock12(focusEntry.time)} · {focusEntry.tag}
              </span>
            </>
          ) : (
            <>
              <h3 className="mt-1 font-display text-xl font-bold text-text">Nothing chosen</h3>
              <span className="mt-2 inline-block rounded-full bg-fill px-2.5 py-1 text-xs text-text-muted">
                Tap to pick from today
              </span>
            </>
          )}
        </div>

        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <Target size={22} strokeWidth={2} />
        </div>
      </button>

      {pickerOpen && (
        <FocusPickerSheet
          entries={entries}
          selectedId={focusEntry?.id ?? null}
          onSelect={setFocusEntryId}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
