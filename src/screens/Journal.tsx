import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthGrid, tagColor, ENTRY_TAGS, type DayRecordV2 } from '../data'
import { useJournalMonth } from '../hooks/useJournalMonth'
import DayCell from '../components/journal/DayCell'
import DaySchedule from '../components/journal/DaySchedule'
import EntryList, { type EntryListItem } from '../components/journal/EntryList'
import QuickAddBar from '../components/journal/QuickAddBar'
import DayViewSheet from '../components/journal/DayViewSheet'
import HabitTracker from '../components/journal/HabitTracker'
import { effectiveIcon } from '../components/journal/activityIcons'

const FILTERS = ['All', ...ENTRY_TAGS]

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Journal() {
  const now = new Date()
  // First-of-month for the displayed month; navigation shifts it.
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const year = viewDate.getFullYear()
  const monthIndex = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex

  const shiftMonth = (delta: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  const goToday = () => setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-display text-[28px] font-bold leading-tight text-text">{monthLabel}</h1>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="press rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-accent"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="press grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Re-mount per month so the month's stored data loads fresh. */}
      <JournalMonth
        key={`${year}-${monthIndex}`}
        year={year}
        monthIndex={monthIndex}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  )
}

interface JournalMonthProps {
  year: number
  monthIndex: number
  isCurrentMonth: boolean
}

/** One month's calendar grid, category filter, selected-day schedule, entries, habits. */
function JournalMonth({ year, monthIndex, isCurrentMonth }: JournalMonthProps) {
  const grid = useMemo(() => buildMonthGrid(new Date(year, monthIndex, 1)), [year, monthIndex])
  const [month, setMonth] = useJournalMonth(year, monthIndex)
  const [viewing, setViewing] = useState<number | null>(null)
  const todayDate = isCurrentMonth ? new Date().getDate() : null
  const [selected, setSelected] = useState<number>(todayDate ?? 1)
  const [filterTag, setFilterTag] = useState<string>('All')

  const items: EntryListItem[] = Object.entries(month).flatMap(([day, record]) =>
    record.entries.map((entry) => ({
      day: Number(day),
      entry,
      icon: effectiveIcon(record) ?? 'journal',
    })),
  )

  const saveDay = (day: number, record: DayRecordV2) =>
    setMonth((prev) => {
      // A day with no icon and no entries is an empty record — drop it.
      if (!record.icon && record.entries.length === 0) {
        const next = { ...prev }
        delete next[day]
        return next
      }
      return { ...prev, [day]: record }
    })

  /** Toggle a task's completion on the selected day. */
  const toggleDone = (entryId: string) => {
    const record = month[selected]
    if (!record) return
    saveDay(selected, {
      ...record,
      entries: record.entries.map((e) => (e.id === entryId ? { ...e, done: !e.done } : e)),
    })
  }

  return (
    <>
      {/* Calendar */}
      <div className="mt-4">
        <div className="mb-2 grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-center text-sm text-text-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.weeks.flat().map((cell, i) => (
            <DayCell
              key={i}
              cell={cell}
              record={cell.inMonth ? month[cell.day] : undefined}
              selected={cell.inMonth && cell.day === selected}
              onPick={setSelected}
              filterTag={filterTag}
            />
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filterTag === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilterTag(f)}
              aria-pressed={active}
              className={`press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                active ? 'border-accent/50 bg-accent/15 text-text' : 'border-border bg-fill text-text-muted'
              }`}
            >
              {f !== 'All' && (
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagColor(f) }} />
              )}
              {f}
            </button>
          )
        })}
      </div>

      {/* Quick add */}
      <QuickAddBar />

      {/* Selected-day events & tasks */}
      <DaySchedule
        year={year}
        monthIndex={monthIndex}
        day={selected}
        isToday={selected === todayDate}
        record={month[selected]}
        onToggleDone={toggleDone}
        onEdit={() => setViewing(selected)}
        onAdd={() => setViewing(selected)}
      />

      {/* Recent entries */}
      <EntryList
        items={items}
        year={year}
        monthIndex={monthIndex}
        onPick={setViewing}
        onAdd={() => setViewing(selected)}
      />

      {/* Habits */}
      <HabitTracker />

      {/* Day view */}
      {viewing !== null && (
        <DayViewSheet
          year={year}
          monthIndex={monthIndex}
          day={viewing}
          record={month[viewing]}
          onSave={saveDay}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  )
}
