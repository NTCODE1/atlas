import { useMemo } from 'react'
import { useSyncedStorage } from './useSyncedStorage'
import {
  EXERCISE_SEED,
  buildExerciseIndex,
  normalizeExercise,
  normalizeSession,
  todayISO,
  type Exercise,
  type ExerciseType,
  type SessionExercise,
  type WorkoutSession,
} from '../workouts'

/**
 * Workout persistence: exercise library + logged sessions. Also read
 * (sessions only) from useDailySnapshot.ts at the app root for training-load
 * — so its two keys may end up synced from two mounted instances at once
 * when the Training screen is also open; harmless (LWW, same underlying
 * localStorage broadcast keeps both instances' values identical), just a
 * little redundant network traffic, not worth the added complexity of
 * splitting this hook to avoid it. Synced through the Worker (see
 * useSyncedStorage.ts / atlas-api/src/sync/trainingSync.ts's "exercises"/
 * "workoutSessions" domains). Raw localStorage values may be older shapes
 * (pre-dating gym/cardio support) — normalized on every read so the rest of
 * the app only ever sees the current shape.
 */
export function useWorkouts() {
  const [rawExercises, setExercises] = useSyncedStorage<Exercise[]>(
    'atlas.workouts.exercises',
    EXERCISE_SEED,
    'exercises',
  )
  const [rawSessions, setSessions] = useSyncedStorage<WorkoutSession[]>(
    'atlas.workouts.sessions',
    [],
    'workoutSessions',
  )

  const exercises = useMemo(() => rawExercises.map(normalizeExercise), [rawExercises])
  const sessions = useMemo(() => rawSessions.map(normalizeSession), [rawSessions])

  const addExercise = (name: string, type: ExerciseType): Exercise => {
    const exercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: name.trim(),
      type,
      createdAt: new Date().toISOString(),
    }
    setExercises((prev) => [...prev, exercise])
    return exercise
  }

  const renameExercise = (id: string, name: string) =>
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name: name.trim() } : e)))

  /** Removes from the library only — session history keeps its name/type snapshots. */
  const deleteExercise = (id: string) => setExercises((prev) => prev.filter((e) => e.id !== id))

  const upsertSession = (session: WorkoutSession) =>
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === session.id)
      return exists ? prev.map((s) => (s.id === session.id ? session : s)) : [...prev, session]
    })

  const deleteSession = (id: string) => setSessions((prev) => prev.filter((s) => s.id !== id))

  /** Creates and persists a fresh, in-progress session (no exercises, no duration yet). */
  const startSession = (): WorkoutSession => {
    const now = new Date()
    const session: WorkoutSession = {
      id: `ws-${Date.now()}`,
      date: todayISO(now),
      startedAt: now.toISOString(),
      durationMinutes: null,
      exercises: [],
    }
    upsertSession(session)
    return session
  }

  /** The one manual "Save" action — commits the total duration for a session. */
  const saveSessionDuration = (id: string, minutes: number) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, durationMinutes: minutes } : s)))

  const todaySessions = sessions.filter((s) => s.date === todayISO())

  const exerciseIndex = useMemo(() => buildExerciseIndex(sessions), [sessions])

  return {
    exercises,
    sessions,
    addExercise,
    renameExercise,
    deleteExercise,
    upsertSession,
    deleteSession,
    startSession,
    saveSessionDuration,
    todaySessions,
    exerciseIndex,
  }
}

/** Fresh session-exercise entry for a library exercise. */
export function newSessionExercise(exercise: Exercise): SessionExercise {
  return {
    id: `sx-${Date.now()}`,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseType: exercise.type,
    sets: [],
  }
}
