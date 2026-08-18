import { useState } from 'react'
import { Check, History, Plus } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  dateISO,
  HABIT_PRESETS,
  streak,
  type HabitChecks,
  type HabitDef,
} from '../../habits'
import { ICONS, type IconId } from '../../icons'
import HabitEditorSheet from './HabitEditorSheet'
import HabitHistorySheet from './HabitHistorySheet'

/**
 * Daily habit check-ins. A check = "kept the goal today" (for avoid-habits:
 * stayed clean). Owns both habit localStorage keys — single consumer.
 */
export default function HabitTracker() {
  const [habits, setHabits] = useLocalStorage<HabitDef[]>('atlas.habits.defs', HABIT_PRESETS)
  const [checks, setChecks] = useLocalStorage<HabitChecks>('atlas.habits.checks', {})
  const [editorOpen, setEditorOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const today = dateISO()
  const todayChecks = checks[today] ?? []

  const toggle = (habitId: string) =>
    setChecks((prev) => {
      const current = prev[today] ?? []
      const next = current.includes(habitId)
        ? current.filter((id) => id !== habitId)
        : [...current, habitId]
      return { ...prev, [today]: next }
    })

  const addHabit = (name: string, icon: IconId) =>
    setHabits((prev) => [...prev, { id: `h-${Date.now()}`, name, icon }])

  const deleteHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id))

  const doneCount = habits.filter((h) => todayChecks.includes(h.id)).length

  return (
    <div className="glass mt-6 rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium tracking-wider text-text-muted">HABITS</span>
          <p className="mt-0.5 text-sm text-text-muted">
            <span className="font-display text-lg font-bold text-text">{doneCount}</span>
            <span className="text-text-muted"> / {habits.length} kept today</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Habit history"
            className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-fill text-text-muted hover:text-text"
          >
            <History size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            aria-label="Manage habits"
            className="press grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {habits.map((habit) => {
          const Icon = ICONS[habit.icon]
          const done = todayChecks.includes(habit.id)
          const s = streak(checks, habit.id)
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => toggle(habit.id)}
              aria-pressed={done}
              title={habit.name}
              className={`press relative flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-colors ${
                done
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-border bg-fill text-text-muted hover:text-text'
              }`}
            >
              <Icon size={20} strokeWidth={2} />
              <span className="w-full truncate px-1 text-center text-[10px] font-medium leading-tight">
                {habit.name}
              </span>
              {done && (
                <span className="absolute -right-1 -top-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-accent text-bg ring-2 ring-bg">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
              {s > 0 && (
                <span className="text-[10px] font-semibold text-accent">{s}d</span>
              )}
            </button>
          )
        })}
      </div>

      {habits.length === 0 && (
        <p className="mt-3 text-sm text-text-muted">No habits yet — tap + to add one.</p>
      )}

      {editorOpen && (
        <HabitEditorSheet
          habits={habits}
          onAdd={addHabit}
          onDelete={deleteHabit}
          onClose={() => setEditorOpen(false)}
        />
      )}
      {historyOpen && (
        <HabitHistorySheet habits={habits} checks={checks} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}
