import { useSyncedStorage } from './useSyncedStorage'
import { useJournalMonth, sortEntriesByTime } from './useJournalMonth'
import { todayISO } from '../workouts'
import type { DayEntryV2 } from '../data'

interface FocusSelection {
  /** YYYY-MM-DD the selection was made on — a stale date is treated as unset. */
  date: string
  entryId: string | null
}

const DEFAULT_SELECTION: FocusSelection = { date: '', entryId: null }

/**
 * Today's chosen "focus" — one of today's journal entries (task/event), or
 * none. Resets naturally each day: the stored selection is keyed by date, and
 * ignored once that date no longer matches today (no explicit reset needed).
 */
export function useTodaysFocus(): {
  entries: DayEntryV2[]
  focusEntry: DayEntryV2 | null
  setFocusEntryId: (entryId: string | null) => void
} {
  const now = new Date()
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const day = now.getDate()
  const today = todayISO()

  const [month] = useJournalMonth(year, monthIndex)
  const entries = sortEntriesByTime(month[day]?.entries ?? [])

  const [selection, setSelection] = useSyncedStorage<FocusSelection>(
    'atlas.home.focus',
    DEFAULT_SELECTION,
    'homeFocus',
  )
  const focusEntry =
    selection.date === today ? (entries.find((e) => e.id === selection.entryId) ?? null) : null

  const setFocusEntryId = (entryId: string | null) => setSelection({ date: today, entryId })

  return { entries, focusEntry, setFocusEntryId }
}
