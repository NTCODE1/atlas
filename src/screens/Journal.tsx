import { useMemo, useState } from 'react'
import {
  buildMonthGrid,
  journalSeed,
  type DayRecord,
  type GridCell,
  type JournalMonth,
} from '../data'
import { useLocalStorage } from '../hooks/useLocalStorage'
import DayCell from '../components/journal/DayCell'
import StreakRail, { type WeekStatus } from '../components/journal/StreakRail'
import EntryList from '../components/journal/EntryList'
import DayEditorSheet from '../components/journal/DayEditorSheet'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Journal() {
  const grid = useMemo(() => buildMonthGrid(), [])
  const [month, setMonth] = useLocalStorage<JournalMonth>(
    `atlas.journal.${grid.year}-${grid.monthIndex}`,
    journalSeed,
  )
  const [editing, setEditing] = useState<number | null>(null)

  const hasActivity = (week: GridCell[]) =>
    week.some((c) => c.inMonth && (month[c.day]?.activity || month[c.day]?.entry))

  const todayRow = grid.weeks.findIndex((w) => w.some((c) => c.isToday))

  const statuses: WeekStatus[] = grid.weeks.map((week, i) => {
    if (i === todayRow) return 'current'
    if (i > todayRow) return 'future'
    return hasActivity(week) ? 'done' : 'future'
  })

  let streak = 0
  for (let i = todayRow; i >= 0; i--) {
    if (hasActivity(grid.weeks[i])) streak++
    else break
  }

  const entries = Object.entries(month)
    .filter(([, rec]) => rec.entry)
    .map(([day, record]) => ({ day: Number(day), record }))
  const entryCount = entries.length

  const saveDay = (day: number, rec: DayRecord) =>
    setMonth((prev) => ({ ...prev, [day]: rec }))
  const deleteDay = (day: number) =>
    setMonth((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">
          {grid.monthLabel}
        </h1>
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-12">
        <div>
          <span className="text-sm text-text-muted">Your Streak</span>
          <p className="mt-0.5 num-glow font-display text-2xl font-bold text-text">{streak} Weeks</p>
        </div>
        <div>
          <span className="text-sm text-text-muted">Journal Entries</span>
          <p className="mt-0.5 num-glow font-display text-2xl font-bold text-text">{entryCount}</p>
        </div>
      </div>

      {/* Calendar + streak rail */}
      <div className="mt-5 flex gap-2">
        <div className="flex-1">
          <div className="mb-2 grid grid-cols-7">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-center text-sm text-text-muted">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-1 gap-y-2">
            {grid.weeks.flat().map((cell, i) => (
              <DayCell
                key={i}
                cell={cell}
                record={cell.inMonth ? month[cell.day] : undefined}
                onPick={setEditing}
              />
            ))}
          </div>
        </div>

        <StreakRail statuses={statuses} streak={streak} />
      </div>

      {/* Recent entries */}
      <EntryList
        entries={entries}
        year={grid.year}
        monthIndex={grid.monthIndex}
        onPick={setEditing}
        onAdd={() => setEditing(new Date().getDate())}
      />

      {/* Day editor */}
      {editing !== null && (
        <DayEditorSheet
          year={grid.year}
          monthIndex={grid.monthIndex}
          day={editing}
          record={month[editing]}
          onSave={saveDay}
          onDelete={deleteDay}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
