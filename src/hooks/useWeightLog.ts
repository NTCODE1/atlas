import { useSyncedStorage } from './useSyncedStorage'
import type { WeightEntry } from '../weightLog'

/**
 * Weight log persistence — a thin useSyncedStorage wrapper (same
 * `[entries, setEntries]` shape as the raw useLocalStorage calls it
 * replaces) so both write sites (OnboardingFlow.tsx, WeightSheet.tsx via
 * Home.tsx) stay in sync through the Worker instead of only the device that
 * happened to log a given weight (see atlas-api/src/sync/weightSync.ts's
 * "weightEntries" domain). One entry per date — later logs overwrite, same
 * as before; that "replace same-date entry" logic still lives at each call
 * site (WeightSheet.tsx), unchanged here.
 */
export function useWeightLog(): [WeightEntry[], React.Dispatch<React.SetStateAction<WeightEntry[]>>] {
  return useSyncedStorage<WeightEntry[]>('atlas.weight.entries', [], 'weightEntries')
}
