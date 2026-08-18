import { useState } from 'react'
import { kgToDisplay, type WeightUnit } from '../../settings'
import {
  exerciseSeries,
  cardioExerciseSeries,
  type CardioProgressMetric,
  type Exercise,
  type ExerciseIndex,
  type ProgressMetric,
} from '../../workouts'
import LineChart from '../ui/LineChart'
import SegmentedControl from '../ui/SegmentedControl'

interface ExerciseProgressProps {
  exercises: Exercise[]
  exerciseIndex: ExerciseIndex
  unit: WeightUnit
}

const GYM_METRIC_OPTIONS: { id: ProgressMetric; label: string }[] = [
  { id: 'top', label: 'Top set' },
  { id: 'e1rm', label: 'Est. 1RM' },
  { id: 'volume', label: 'Volume' },
]

const CARDIO_METRIC_OPTIONS: { id: CardioProgressMetric; label: string }[] = [
  { id: 'distance', label: 'Distance' },
  { id: 'pace', label: 'Pace' },
  { id: 'duration', label: 'Duration' },
]

/** Progress tab: pick an exercise + metric, see the trend over time vs
 *  previous sessions of the same exercise. Reads from the shared
 *  exerciseIndex (built once in useWorkouts) rather than rescanning sessions. */
export default function ExerciseProgress({ exercises, exerciseIndex, unit }: ExerciseProgressProps) {
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '')
  const [gymMetric, setGymMetric] = useState<ProgressMetric>('top')
  const [cardioMetric, setCardioMetric] = useState<CardioProgressMetric>('distance')

  const selected = exercises.find((e) => e.id === exerciseId)
  const isCardio = selected?.type === 'cardio'

  const series = isCardio
    ? cardioExerciseSeries(exerciseIndex, exerciseId, cardioMetric)
    : exerciseSeries(exerciseIndex, exerciseId, gymMetric).map((p) => ({
        ...p,
        v: kgToDisplay(p.v, unit),
      }))

  const unitLabel = isCardio
    ? cardioMetric === 'distance'
      ? 'km'
      : cardioMetric === 'pace'
        ? 'min/km'
        : 'min'
    : unit

  // Pace is a "lower is better" metric; everything else is "higher is better".
  const lowerIsBetter = isCardio && cardioMetric === 'pace'
  const latest = series[series.length - 1]
  const best = series.reduce(
    (b, p) => (lowerIsBetter ? Math.min(b, p.v) : Math.max(b, p.v)),
    lowerIsBetter ? Infinity : 0,
  )

  return (
    <div className="mt-4 flex flex-col gap-3">
      <select
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
        aria-label="Exercise"
        className="glass-subtle w-full appearance-none rounded-2xl px-3.5 py-3 text-sm font-medium text-text focus:border-accent/60 focus:outline-none [&>option]:bg-surface"
      >
        {exercises.length === 0 && <option value="">No exercises in library</option>}
        {exercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
      </select>

      {isCardio ? (
        <SegmentedControl options={CARDIO_METRIC_OPTIONS} value={cardioMetric} onChange={setCardioMetric} />
      ) : (
        <SegmentedControl options={GYM_METRIC_OPTIONS} value={gymMetric} onChange={setGymMetric} />
      )}

      {series.length < 2 ? (
        <p className="mt-4 text-center text-sm text-text-muted">
          Log this exercise in at least two sessions to see a trend.
        </p>
      ) : (
        <>
          <div className="glass rounded-[22px] px-4 py-4">
            <LineChart points={series} unit={unitLabel} />
          </div>

          <div className="flex gap-2.5">
            <div className="glass-subtle flex flex-1 flex-col rounded-[22px] px-3 py-3">
              <span className="text-[11px] font-medium tracking-wider text-text-muted">LATEST</span>
              <span className="mt-1 font-display text-2xl font-bold text-text">
                {latest.v.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-text-muted">{unitLabel}</span>
              </span>
            </div>
            <div className="glass-subtle flex flex-1 flex-col rounded-[22px] px-3 py-3">
              <span className="text-[11px] font-medium tracking-wider text-text-muted">
                {lowerIsBetter ? 'FASTEST' : 'BEST'}
              </span>
              <span className="mt-1 font-display text-2xl font-bold text-accent">
                {best.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-text-muted">{unitLabel}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
