import { useSyncedStorage } from './useSyncedStorage'
import type { ActivitySession } from '../activities'

/**
 * Ski / trampoline / cardio session log. Synced through the Worker (see
 * atlas-api/src/sync/trainingSync.ts's "activitySessions" domain). Kept
 * forever like gym history — no pruning.
 */
export function useActivities() {
  const [activities, setActivities] = useSyncedStorage<ActivitySession[]>(
    'atlas.training.activities',
    [],
    'activitySessions',
  )

  const addActivity = (a: ActivitySession) => setActivities((prev) => [...prev, a])
  const deleteActivity = (id: string) => setActivities((prev) => prev.filter((a) => a.id !== id))

  return { activities, addActivity, deleteActivity }
}
