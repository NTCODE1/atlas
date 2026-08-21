import { useState } from 'react'
import { writeLocalStorage } from './useLocalStorage'
import { useSyncedStorage } from './useSyncedStorage'
import {
  journalSeed,
  type DayEntryV2,
  type DayRecord,
  type DayRecordV2,
  type JournalMonth,
  type JournalMonthV2,
} from '../data'

const v2Key = (year: number, monthIndex: number) => `atlas.journal.v2.${year}-${monthIndex}`
const legacyKey = (year: number, monthIndex: number) => `atlas.journal.${year}-${monthIndex}`
/** Worker sync path for one month — see atlas-api/src/sync/journalSync.ts's per-month route. */
const syncPath = (year: number, monthIndex: number) => `journal/${year}-${monthIndex}`

/**
 * One-time wipe of all stored journal/calendar data so the calendar starts
 * blank. Guarded by a flag so it runs exactly once per device; the flag itself
 * is preserved. Runs at module load, before any journal read.
 */
const RESET_FLAG = 'atlas.journal.reset.v1'
function clearJournalDataOnce() {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(RESET_FLAG)) return
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('atlas.journal.')) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
    window.localStorage.setItem(RESET_FLAG, '1')
  } catch {
    // storage blocked — ignore; nothing to reset
  }
}
clearJournalDataOnce()

/** Generate a fresh entry id (uuid when available, else a time+random string). */
export const newJournalId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function migrateRecord(record: DayRecord | DayRecordV2): DayRecordV2 {
  // Already v2-shaped — pass through untouched (migration is idempotent).
  if ('entries' in record && Array.isArray(record.entries)) return record as DayRecordV2
  const legacy = record as DayRecord
  return {
    icon: legacy.activity ?? (legacy.entry ? 'journal' : undefined),
    entries: legacy.entry ? [{ ...legacy.entry, id: newJournalId(), important: false }] : [],
  }
}

export function migrateMonth(month: JournalMonth | JournalMonthV2): JournalMonthV2 {
  const out: JournalMonthV2 = {}
  for (const [day, record] of Object.entries(month)) {
    out[Number(day)] = migrateRecord(record)
  }
  return out
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/**
 * Month journal store with lazy v1 → v2 migration. Reads the v2 key when
 * present; otherwise migrates the legacy key (or, failing that, the bundled
 * seed for the current month). The migrated value becomes useSyncedStorage's
 * initial state and is persisted to the v2 key on first render — the legacy
 * key is never written or deleted, so rolling back stays safe. Synced
 * through the Worker per-month (see atlas-api/src/sync/journalSync.ts) —
 * one month's push/pull never touches another month's data.
 */
export function useJournalMonth(year: number, monthIndex: number) {
  const [initial] = useState<JournalMonthV2>(() => {
    if (typeof window === 'undefined') return migrateMonth(journalSeed)
    const v2 = readJSON<JournalMonthV2>(v2Key(year, monthIndex))
    if (v2) return migrateMonth(v2) // pass-through; also heals partial shapes
    const legacy = readJSON<JournalMonth>(legacyKey(year, monthIndex))
    return migrateMonth(legacy ?? journalSeed)
  })

  return useSyncedStorage<JournalMonthV2>(v2Key(year, monthIndex), initial, syncPath(year, monthIndex))
}

/**
 * Non-hook read of a single day's record, for code that must not subscribe to
 * React state (e.g. the notification pass on app load).
 */
export function readJournalDay(date: Date): { record: DayRecordV2 | undefined; dateISO: string } {
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const day = date.getDate()
  const dateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const v2 = readJSON<JournalMonthV2>(v2Key(year, monthIndex))
  if (v2?.[day]) return { record: migrateRecord(v2[day]), dateISO }

  const legacy = readJSON<JournalMonth>(legacyKey(year, monthIndex))
  if (legacy?.[day]) return { record: migrateRecord(legacy[day]), dateISO }

  return { record: undefined, dateISO }
}

/** Sort helper: entries by time ascending. */
export const sortEntriesByTime = (entries: DayEntryV2[]): DayEntryV2[] =>
  [...entries].sort((a, b) => a.time.localeCompare(b.time))

/**
 * Add journal entries across arbitrary dates (used by calendar-parse). Each item
 * is `{ date: 'YYYY-MM-DD', entry }`. Entries are grouped by month, merged into
 * the existing day records, and written directly to each month's v2 key with a
 * sync broadcast — so an open Journal screen on an affected month updates live.
 *
 * Note: this bypasses useSyncedStorage's own push, since it writes straight to
 * localStorage rather than through a mounted useJournalMonth hook. A mounted
 * hook for the affected month still picks it up locally (the same broadcast
 * useLocalStorage already does) and pushes it on its next debounced push —
 * but a month nobody currently has open only syncs to the Worker the next
 * time it's actually viewed. Acceptable for now (calendar-parsed entries are
 * an infrequent path); revisit if that lag turns out to matter.
 */
export function addJournalEntries(items: { date: string; entry: DayEntryV2 }[]): void {
  if (typeof window === 'undefined' || items.length === 0) return

  // Group by month key, remembering the parsed day for each entry.
  const byKey = new Map<string, { day: number; entry: DayEntryV2 }[]>()
  for (const { date, entry } of items) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!m) continue
    const key = v2Key(Number(m[1]), Number(m[2]) - 1)
    const list = byKey.get(key) ?? []
    list.push({ day: Number(m[3]), entry })
    byKey.set(key, list)
  }

  for (const [key, group] of byKey) {
    const month = migrateMonth(readJSON<JournalMonthV2>(key) ?? {})
    for (const { day, entry } of group) {
      const record = month[day] ?? { entries: [] }
      month[day] = { ...record, entries: [...record.entries, entry] }
    }
    writeLocalStorage(key, month)
  }
}
