import { ICONS, ICON_LABEL, type IconId } from '../../icons'
import type { Workout, WorkoutType } from '../../api/workoutMapper'

interface CardioHistoryProps {
  workouts: Workout[]
}

const WORKOUT_TYPE_ICON: Record<WorkoutType, IconId> = {
  run: 'run',
  bike: 'bike',
  swim: 'swim',
  hike: 'hike',
  // No ski glyph in the shared icon set — the mountain reads right for it.
  ski: 'hike',
  strength: 'strength',
  other: 'strength',
}

/** Row label overrides where the borrowed icon's own label would be wrong. */
const WORKOUT_TYPE_LABEL: Partial<Record<WorkoutType, string>> = { ski: 'Skiing' }

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

/** Cardio tab: watch-imported runs/rides/swims, newest-first. Not user-editable in v1. */
export default function CardioHistory({ workouts }: CardioHistoryProps) {
  const sorted = [...workouts].sort(
    (a, b) => `${b.date}T${b.startTime ?? ''}`.localeCompare(`${a.date}T${a.startTime ?? ''}`),
  )

  if (sorted.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-text-muted">
        No watch workouts synced yet — they&apos;ll appear here automatically.
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {sorted.map((workout) => {
        const icon = WORKOUT_TYPE_ICON[workout.type]
        const Icon = ICONS[icon]
        const parts: string[] = []
        if (workout.durationMinutes !== null) parts.push(`${workout.durationMinutes} min`)
        if (workout.distanceKm !== null) parts.push(`${workout.distanceKm.toFixed(2)} km`)
        if (workout.paceMinPerKm !== null) parts.push(`${workout.paceMinPerKm.toFixed(1)} min/km`)
        if (workout.avgHeartRate !== null) parts.push(`${Math.round(workout.avgHeartRate)} bpm avg`)
        if (workout.maxHeartRate !== null) parts.push(`${Math.round(workout.maxHeartRate)} bpm max`)

        return (
          <div key={workout.id} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text">
                {WORKOUT_TYPE_LABEL[workout.type] ?? ICON_LABEL[icon]} · {formatDate(workout.date)}
                {workout.startTime ? ` · ${workout.startTime}` : ''}
              </span>
              <span className="text-xs text-text-muted">
                {parts.length > 0 ? parts.join(' · ') : 'No detail reported'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
