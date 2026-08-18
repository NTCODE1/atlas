import { useState } from 'react'
import { Check, Dumbbell, Plus, Trash2 } from 'lucide-react'
import type { WeightUnit } from '../../settings'
import type {
  CardioSetEntry,
  Exercise,
  ExerciseType,
  GymSetEntry,
  SessionExercise,
  SetEntry,
  WorkoutSession,
} from '../../workouts'
import { newSessionExercise } from '../../hooks/useWorkouts'
import SetRow from './SetRow'
import CardioSetRow from './CardioSetRow'
import ExercisePickerSheet from './ExercisePickerSheet'

interface SessionLoggerProps {
  /** The session being edited, if any is active. */
  session: WorkoutSession | undefined
  dateLabel: string
  exercises: Exercise[]
  defaultUnit: WeightUnit
  onStart: () => void
  onChange: (session: WorkoutSession) => void
  onSaveDuration: (minutes: number) => void
  /** Creates a library exercise and returns it (so it can join the session). */
  onCreateExercise: (name: string, type: ExerciseType) => Exercise
  onRenameExercise: (id: string, name: string) => void
  onDeleteExercise: (id: string) => void
}

const defaultSet = (type: ExerciseType, last: SetEntry | undefined, unit: WeightUnit): SetEntry => {
  if (type === 'cardio') {
    return last?.kind === 'cardio' ? { ...last } : { kind: 'cardio', distanceKm: 0, durationMinutes: 0 }
  }
  return last?.kind === 'gym' ? { ...last } : { kind: 'gym', reps: 8, weight: 0, unit }
}

/** Log tab: the editable session — exercise cards with set rows, plus a
 *  manual duration + Save block that finalizes the session. */
export default function SessionLogger({
  session,
  dateLabel,
  exercises,
  defaultUnit,
  onStart,
  onChange,
  onSaveDuration,
  onCreateExercise,
  onRenameExercise,
  onDeleteExercise,
}: SessionLoggerProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [duration, setDuration] = useState(session?.durationMinutes?.toString() ?? '')

  if (!session) {
    return (
      <div className="glass mt-4 flex flex-col items-center gap-3 rounded-[22px] px-5 py-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
          <Dumbbell size={22} strokeWidth={2} />
        </div>
        <p className="text-sm text-text-muted">No workout logged for {dateLabel} yet.</p>
        <button
          type="button"
          onClick={onStart}
          className="press rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg"
        >
          Start Training
        </button>
      </div>
    )
  }

  const patchExercise = (id: string, fields: Partial<SessionExercise>) =>
    onChange({
      ...session,
      exercises: session.exercises.map((ex) => (ex.id === id ? { ...ex, ...fields } : ex)),
    })

  const addExerciseToSession = (exercise: Exercise) => {
    onChange({ ...session, exercises: [...session.exercises, newSessionExercise(exercise)] })
    setPickerOpen(false)
  }

  const removeExercise = (id: string) =>
    onChange({ ...session, exercises: session.exercises.filter((ex) => ex.id !== id) })

  const addSet = (ex: SessionExercise) => {
    // Duplicate the last set so progressive logging is one tap + tweak.
    const last = ex.sets[ex.sets.length - 1]
    const next = defaultSet(ex.exerciseType, last, defaultUnit)
    patchExercise(ex.id, { sets: [...ex.sets, next] })
  }

  const minutes = Number(duration)
  const canSave = Number.isFinite(minutes) && minutes > 0
  const saveDuration = () => canSave && onSaveDuration(minutes)

  return (
    <div className="mt-4 flex flex-col gap-3">
      {session.exercises.map((ex) => {
        const gymSets = ex.sets.filter((s): s is GymSetEntry => s.kind === 'gym')
        const cardioSets = ex.sets.filter((s): s is CardioSetEntry => s.kind === 'cardio')
        return (
          <div key={ex.id} className="glass rounded-[22px] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-semibold text-text">
                {ex.exerciseName}
              </span>
              <button
                type="button"
                onClick={() => removeExercise(ex.id)}
                aria-label={`Remove ${ex.exerciseName}`}
                className="press grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {ex.exerciseType === 'gym'
                ? gymSets.map((set, i) => (
                    <SetRow
                      key={i}
                      index={i}
                      set={set}
                      onChange={(next) =>
                        patchExercise(ex.id, { sets: ex.sets.map((s, j) => (j === i ? next : s)) })
                      }
                      onRemove={() => patchExercise(ex.id, { sets: ex.sets.filter((_, j) => j !== i) })}
                    />
                  ))
                : cardioSets.map((set, i) => (
                    <CardioSetRow
                      key={i}
                      index={i}
                      set={set}
                      onChange={(next) =>
                        patchExercise(ex.id, { sets: ex.sets.map((s, j) => (j === i ? next : s)) })
                      }
                      onRemove={() => patchExercise(ex.id, { sets: ex.sets.filter((_, j) => j !== i) })}
                    />
                  ))}
            </div>

            <button
              type="button"
              onClick={() => addSet(ex)}
              className="press mt-2.5 flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <Plus size={13} strokeWidth={2.5} />
              Set
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="press flex items-center justify-center gap-2 rounded-[22px] border border-dashed border-border-strong bg-fill py-3.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add exercise
      </button>

      <div className="glass-subtle flex items-center gap-2 rounded-[22px] px-4 py-3.5">
        <label className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-text-muted">DURATION</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={duration}
            placeholder="minutes"
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
          />
          <span className="text-xs text-text-muted">min</span>
        </label>
        <button
          type="button"
          onClick={saveDuration}
          disabled={!canSave}
          className="press flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-bg transition-opacity disabled:opacity-40"
        >
          <Check size={13} strokeWidth={2.5} />
          Save
        </button>
      </div>

      {pickerOpen && (
        <ExercisePickerSheet
          exercises={exercises}
          onPick={addExerciseToSession}
          onCreate={(name, type) => addExerciseToSession(onCreateExercise(name, type))}
          onRename={onRenameExercise}
          onDelete={onDeleteExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
