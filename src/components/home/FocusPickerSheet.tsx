import { Check } from 'lucide-react'
import Sheet from '../ui/Sheet'
import { formatClock12, type DayEntryV2 } from '../../data'

interface FocusPickerSheetProps {
  entries: DayEntryV2[]
  selectedId: string | null
  onSelect: (entryId: string | null) => void
  onClose: () => void
}

/** Pick today's focus from the day's journal entries, or clear it to None. */
export default function FocusPickerSheet({
  entries,
  selectedId,
  onSelect,
  onClose,
}: FocusPickerSheetProps) {
  const pick = (id: string | null) => {
    onSelect(id)
    onClose()
  }

  return (
    <Sheet title="Today's focus" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => pick(null)}
          className={`press flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
            selectedId === null ? 'border-accent/50 bg-accent/10' : 'border-border bg-fill'
          }`}
        >
          <span className="text-sm font-medium text-text">None</span>
          {selectedId === null && <Check size={16} strokeWidth={2.5} className="text-accent" />}
        </button>

        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            No plans logged today — add one from the Journal tab.
          </p>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => pick(entry.id)}
              className={`press flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                selectedId === entry.id ? 'border-accent/50 bg-accent/10' : 'border-border bg-fill'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{entry.text}</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {formatClock12(entry.time)} · {entry.tag}
                </span>
              </span>
              {selectedId === entry.id && (
                <Check size={16} strokeWidth={2.5} className="shrink-0 text-accent" />
              )}
            </button>
          ))
        )}
      </div>
    </Sheet>
  )
}
