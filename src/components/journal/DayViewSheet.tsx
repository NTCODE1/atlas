import { useState } from 'react'
import { Moon, Plus, Star } from 'lucide-react'
import { formatEntryDate, type DayEntryV2, type DayRecordV2 } from '../../data'
import { ICONS, ICON_LABEL, type IconId } from '../../icons'
import { sortEntriesByTime } from '../../hooks/useJournalMonth'
import Sheet from '../ui/Sheet'
import IconPicker from '../ui/IconPicker'
import EntryEditor from './EntryEditor'

interface DayViewSheetProps {
  year: number
  monthIndex: number
  day: number
  record?: DayRecordV2
  onSave: (day: number, record: DayRecordV2) => void
  onClose: () => void
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 06:00 – 23:00

type Editing = { entry?: DayEntryV2; defaultTime?: string } | null

const hourOf = (time: string): number => Number(time.slice(0, 2))

/**
 * Scrollable day view: date header + day icon, then an hourly timeline with
 * the day's entries placed at their times. Tapping a slot or entry swaps the
 * sheet content to the entry editor (one sheet, no stacked scrims).
 */
export default function DayViewSheet({
  year,
  monthIndex,
  day,
  record,
  onSave,
  onClose,
}: DayViewSheetProps) {
  const [editing, setEditing] = useState<Editing>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const entries = sortEntriesByTime(record?.entries ?? [])
  const icon = record?.icon
  const CurrentIcon = icon ? ICONS[icon] : null

  const patch = (fields: Partial<DayRecordV2>) =>
    onSave(day, { icon: record?.icon, entries: record?.entries ?? [], ...fields })

  const saveEntry = (entry: DayEntryV2) => {
    const rest = entries.filter((e) => e.id !== entry.id)
    patch({ entries: [...rest, entry] })
  }

  const deleteEntry = (id: string) => patch({ entries: entries.filter((e) => e.id !== id) })

  const pickIcon = (id: IconId | undefined) => {
    patch({ icon: id })
    setIconPickerOpen(false)
  }

  // Entries before 06:00 collect in a "Night" bucket above the timeline.
  const nightEntries = entries.filter((e) => hourOf(e.time) < HOURS[0])

  return (
    <Sheet title={formatEntryDate(year, monthIndex, day)} maxHeight="tall" onClose={onClose}>
      {editing ? (
        <EntryEditor
          entry={editing.entry}
          defaultTime={editing.defaultTime}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onBack={() => setEditing(null)}
        />
      ) : (
        <>
          {/* Day icon + add entry */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIconPickerOpen((v) => !v)}
              aria-expanded={iconPickerOpen}
              className={`press flex items-center gap-2.5 rounded-full border px-3.5 py-2 transition-colors ${
                CurrentIcon
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border bg-fill text-text-muted'
              }`}
            >
              {CurrentIcon ? <CurrentIcon size={17} strokeWidth={2} /> : <Plus size={15} strokeWidth={2} />}
              <span className="text-sm font-medium">
                {icon ? ICON_LABEL[icon] : 'Day icon'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEditing({ defaultTime: '09:00' })}
              className="press flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <Plus size={15} strokeWidth={2.5} />
              Entry
            </button>
          </div>

          {iconPickerOpen && (
            <div className="glass-subtle mt-3 rounded-2xl p-3">
              <IconPicker value={icon} onChange={pickIcon} />
            </div>
          )}

          {/* Night bucket */}
          {nightEntries.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-text-muted">
                <Moon size={13} strokeWidth={2} />
                <span className="text-[11px] font-medium tracking-wider">NIGHT</span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {nightEntries.map((entry) => (
                  <EntryChip key={entry.id} entry={entry} onClick={() => setEditing({ entry })} />
                ))}
              </div>
            </div>
          )}

          {/* Hourly timeline */}
          <div className="mt-4 flex flex-col">
            {HOURS.map((hour) => {
              const slotEntries = entries.filter((e) => hourOf(e.time) === hour)
              const label = `${String(hour).padStart(2, '0')}:00`
              return (
                <div key={hour} className="flex min-h-[2.75rem] gap-3 border-t border-border py-1.5">
                  <span className="w-11 shrink-0 pt-1 text-xs tabular-nums text-text-muted">
                    {label}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {slotEntries.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setEditing({ defaultTime: label })}
                        aria-label={`Add entry at ${label}`}
                        className="h-full min-h-[1.75rem] w-full rounded-lg transition-colors hover:bg-fill"
                      />
                    ) : (
                      slotEntries.map((entry) => (
                        <EntryChip key={entry.id} entry={entry} onClick={() => setEditing({ entry })} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}

function EntryChip({ entry, onClick }: { entry: DayEntryV2; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-subtle press flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left"
    >
      {entry.important && (
        <Star size={13} strokeWidth={2} className="mt-0.5 shrink-0 fill-rose text-rose" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text">{entry.text}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
          <span className="tabular-nums">{entry.time}</span>
          <span className="font-semibold tracking-wide text-accent">{entry.tag}</span>
        </span>
      </span>
    </button>
  )
}
