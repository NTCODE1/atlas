import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchWorkoutsData, fallbackHealthData } from './healthData'
import { mapWorkouts, type Workout } from './workoutMapper'

interface WorkoutContextValue {
  /** Watch-imported workouts, mapped from the latest stored payload. Empty when none exist. */
  workouts: Workout[]
  /** True until the initial fetch resolves. */
  loading: boolean
}

const WorkoutContext = createContext<WorkoutContextValue>({ workouts: [], loading: true })

/**
 * Fetches the latest Workouts+Routes payload once on mount and maps it. Kept
 * separate from HealthProvider so the existing dashboard data flow is
 * untouched by this feature.
 */
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkoutContextValue>({ workouts: [], loading: true })

  useEffect(() => {
    let cancelled = false
    fetchWorkoutsData().then((raw) => {
      if (cancelled) return
      setState({
        workouts: raw === fallbackHealthData ? [] : mapWorkouts(raw),
        loading: false,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <WorkoutContext.Provider value={state}>{children}</WorkoutContext.Provider>
}

/** Read the watch-imported workouts and loading state. */
export function useWatchWorkouts(): WorkoutContextValue {
  return useContext(WorkoutContext)
}
