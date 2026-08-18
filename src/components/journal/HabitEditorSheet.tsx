import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { HabitDef } from '../../habits'
import { ICONS, type IconId } from '../../icons'
import Sheet from '../ui/Sheet'
import IconPicker from '../ui/IconPicker'

interface HabitEditorSheetProps {
  habits: HabitDef[]
  onAdd: (name: string, icon: IconId) => void
  onDelete: (id: string) => void
  onClose: () => void
}

/** Add a custom habit (name + icon) and manage the existing list. */
export default function HabitEditorSheet({
  habits,
  onAdd,
  onDelete,
  onClose,
}: HabitEditorSheetProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<IconId | undefined>(undefined)

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, icon ?? 'star')
    setName('')
    setIcon(undefined)
  }

  return (
    <Sheet title="Habits" maxHeight="tall" onClose={onClose}>
      <span className="block text-[11px] font-medium tracking-wider text-text-muted">
        NEW HABIT
      </span>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="e.g. Cold shower"
        className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
      />
      <div className="glass-subtle mt-2.5 rounded-2xl p-3">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!name.trim()}
        className="press mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Add habit
      </button>

      <span className="mt-6 block text-[11px] font-medium tracking-wider text-text-muted">
        YOUR HABITS
      </span>
      <ul className="mt-2 flex flex-col">
        {habits.map((habit, i) => {
          const Icon = ICONS[habit.icon]
          return (
            <li
              key={habit.id}
              className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
                <Icon size={15} strokeWidth={2} />
              </div>
              <span className="flex-1 text-sm text-text">{habit.name}</span>
              <button
                type="button"
                onClick={() => onDelete(habit.id)}
                aria-label={`Delete ${habit.name}`}
                className="press grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </li>
          )
        })}
        {habits.length === 0 && (
          <li className="py-2 text-sm text-text-muted">No habits yet — add one above.</li>
        )}
      </ul>
    </Sheet>
  )
}
