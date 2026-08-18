import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { sortEntries, type Vo2MaxEntry } from '../../vo2max'
import { todayISO } from '../../workouts'
import Sheet from '../ui/Sheet'

interface Vo2MaxSheetProps {
  entries: Vo2MaxEntry[]
  setEntries: React.Dispatch<React.SetStateAction<Vo2MaxEntry[]>>
  onClose: () => void
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Manual VO2 max log: COROS has no way to sync this to Apple Health, so this
 *  is how the number from the COROS app's Training Status page gets in. */
export default function Vo2MaxSheet({ entries, setEntries, onClose }: Vo2MaxSheetProps) {
  const [date, setDate] = useState(todayISO())
  const [value, setValue] = useState('')

  const add = () => {
    const v = Number(value)
    if (!Number.isFinite(v) || v <= 0) return
    // One entry per date — logging the same day again overwrites it.
    setEntries((prev) => [...prev.filter((e) => e.date !== date), { date, value: v }])
    setValue('')
  }

  const remove = (entryDate: string) =>
    setEntries((prev) => prev.filter((e) => e.date !== entryDate))

  const recent = sortEntries(entries).reverse().slice(0, 14)

  return (
    <Sheet title="VO2 max" onClose={onClose}>
      <p className="text-sm text-text-muted">
        Check your COROS app (Training Status → VO2max) and log the number here — once a week is
        plenty, since it&apos;s a slow-moving fitness measure.
      </p>

      {/* Add entry */}
      <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
        LOG VO2 MAX
      </span>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
        />
        <div className="flex flex-1 items-center rounded-lg border border-border bg-bg px-3 focus-within:border-accent/60">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={value}
            placeholder="0.0"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="w-full bg-transparent py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          <span className="text-xs text-text-muted">ml/kg/min</span>
        </div>
        <button
          type="button"
          onClick={add}
          aria-label="Add VO2 max entry"
          className="press grid w-11 place-items-center rounded-lg bg-accent text-bg transition-opacity hover:opacity-90"
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <>
          <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
            RECENT
          </span>
          <ul className="mt-2 flex flex-col">
            {recent.map((entry, i) => (
              <li
                key={entry.date}
                className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <span className="flex-1 text-sm text-text">{formatDate(entry.date)}</span>
                <span className="font-display text-sm font-semibold text-text">
                  {entry.value.toFixed(1)}
                  <span className="ml-0.5 text-xs font-normal text-text-muted">ml/kg/min</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry.date)}
                  aria-label={`Delete entry for ${formatDate(entry.date)}`}
                  className="press grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
