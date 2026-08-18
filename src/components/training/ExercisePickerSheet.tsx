import { useState } from 'react'
import { Check, Dumbbell, Footprints, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Exercise, ExerciseType } from '../../workouts'
import Sheet from '../ui/Sheet'
import SegmentedControl from '../ui/SegmentedControl'

interface ExercisePickerSheetProps {
  exercises: Exercise[]
  onPick: (exercise: Exercise) => void
  onCreate: (name: string, type: ExerciseType) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const TYPE_OPTIONS: { id: ExerciseType; label: string }[] = [
  { id: 'gym', label: 'Gym' },
  { id: 'cardio', label: 'Cardio' },
]

const TYPE_ICON: Record<ExerciseType, typeof Dumbbell> = { gym: Dumbbell, cardio: Footprints }

/**
 * Exercise library sheet: search/filter, tap to add to the session, create
 * new inline, and manage the library (rename/delete) per row.
 */
export default function ExercisePickerSheet({
  exercises,
  onPick,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: ExercisePickerSheetProps) {
  const [query, setQuery] = useState('')
  const [createType, setCreateType] = useState<ExerciseType>('gym')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q))
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === q)

  const commitRename = () => {
    if (editingId && editName.trim()) onRename(editingId, editName)
    setEditingId(null)
  }

  return (
    <Sheet title="Add exercise" maxHeight="tall" onClose={onClose}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or type a new exercise…"
        className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
      />

      {q && !exactMatch && (
        <div className="mt-3">
          <SegmentedControl options={TYPE_OPTIONS} value={createType} onChange={setCreateType} />
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {q && !exactMatch && (
          <button
            type="button"
            onClick={() => onCreate(query.trim(), createType)}
            className="press flex items-center gap-2.5 rounded-2xl border border-accent/40 bg-accent/10 px-3.5 py-3 text-left text-sm font-semibold text-accent"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create “{query.trim()}”
          </button>
        )}

        {filtered.map((exercise) => {
          const TypeIcon = TYPE_ICON[exercise.type]
          return (
            <div key={exercise.id} className="glass-subtle flex items-center gap-1 rounded-2xl px-2 py-1.5">
              <TypeIcon size={14} strokeWidth={2} className="ml-1 shrink-0 text-text-muted" aria-hidden />
            {editingId === exercise.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  autoFocus
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                  className="w-full min-w-0 flex-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-accent/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={commitRename}
                  aria-label="Save name"
                  className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-accent"
                >
                  <Check size={15} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel rename"
                  className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </>
            ) : confirmDeleteId === exercise.id ? (
              <>
                <span className="flex-1 truncate px-1.5 text-sm text-text">
                  Delete “{exercise.name}”?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(exercise.id)
                    setConfirmDeleteId(null)
                  }}
                  className="press shrink-0 rounded-full bg-rose/15 px-3 py-1.5 text-xs font-semibold text-rose"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="press shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted"
                >
                  Keep
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onPick(exercise)}
                  className="press flex-1 truncate px-1.5 py-1.5 text-left text-sm font-medium text-text"
                >
                  {exercise.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(exercise.id)
                    setEditName(exercise.name)
                  }}
                  aria-label={`Rename ${exercise.name}`}
                  className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(exercise.id)}
                  aria-label={`Delete ${exercise.name}`}
                  className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted hover:text-rose"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
          )
        })}

        {filtered.length === 0 && !q && (
          <p className="py-2 text-sm text-text-muted">Library is empty — type a name to create one.</p>
        )}
      </div>
    </Sheet>
  )
}
