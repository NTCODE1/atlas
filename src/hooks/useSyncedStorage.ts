import { useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { pullSync, pushSync } from '../api/syncClient'

interface SyncMeta {
  /** epoch ms this device last knows to be in sync with the server, for this key. */
  updatedAt: number
}

const syncMetaKey = (key: string) => `atlas.sync.meta.${key}`

function readSyncMeta(key: string): SyncMeta | null {
  try {
    const raw = localStorage.getItem(syncMetaKey(key))
    return raw !== null ? (JSON.parse(raw) as SyncMeta) : null
  } catch {
    return null
  }
}

function writeSyncMeta(key: string, meta: SyncMeta): void {
  try {
    localStorage.setItem(syncMetaKey(key), JSON.stringify(meta))
  } catch {
    // storage full/blocked — sync bookkeeping just won't persist this round
  }
}

/** Wait this long after the last local edit before pushing, so rapid successive edits (e.g. typing) collapse into one request. */
const PUSH_DEBOUNCE_MS = 2000

/**
 * Drop-in replacement for useLocalStorage that also syncs `key`'s whole
 * value through the Worker (see atlas-api/src/sync.ts) — same signature,
 * same instant local read/write, so call sites barely change. localStorage
 * stays the source of truth for rendering; syncing happens in the
 * background and never blocks or throws (mirrors healthData.ts's
 * offline-first philosophy — an unreachable Worker just means this device
 * keeps working off its local copy until it can sync again).
 *
 * `syncPath` is the Worker route segment after `/api/sync/` — must match a
 * name registered in atlas-api's SYNC_REGISTRY (src/index.ts) exactly, e.g.
 * `"meals"` for `atlas.nutrition.meals`. Deliberately not derived from `key`
 * automatically (the two rarely line up 1:1 — e.g. journal's per-month keys
 * need a computed `journal/2026-7` path) — passing it explicitly keeps the
 * frontend/Worker mapping easy to grep for in both directions.
 *
 * Sync model (see atlas-api/src/sync.ts for the server side of this):
 *   - On mount, pulls the server's value once. If this device has never
 *     synced this key before AND its current local value is genuinely
 *     different from `initial` (not just the untouched default — see the
 *     comparison below), that local value is treated as real and pushed
 *     immediately, rather than being silently discarded in favor of
 *     whatever the server has. This is what carries a device's pre-existing
 *     local-only history up to D1 the first time it opens the updated app.
 *     Otherwise, the server's value (if newer than this device last knew)
 *     is adopted as the new local baseline.
 *   - Every local edit after that pushes in the background (debounced).
 */
export function useSyncedStorage<T>(
  key: string,
  initial: T,
  syncPath: string,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useLocalStorage<T>(key, initial)

  const readyToPushRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialRef = useRef(initial)
  const valueRef = useRef(value)
  valueRef.current = value

  // Pull (or bootstrap-push) once per mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const meta = readSyncMeta(key)
      const pulled = await pullSync<T>(syncPath)
      if (cancelled) return
      if (pulled === null) {
        readyToPushRef.current = true // Worker unreachable — still allow local edits to queue a push attempt later.
        return
      }

      if (meta === null) {
        const looksReal = JSON.stringify(valueRef.current) !== JSON.stringify(initialRef.current)
        if (looksReal) {
          const pushedAt = Date.now()
          const accepted = await pushSync(syncPath, valueRef.current, pushedAt)
          if (!cancelled) {
            if (accepted) writeSyncMeta(key, { updatedAt: pushedAt })
            readyToPushRef.current = true
          }
          return
        }
      }

      const localUpdatedAt = meta?.updatedAt ?? 0
      if (pulled.updatedAt > localUpdatedAt) {
        setValue(pulled.value)
        writeSyncMeta(key, { updatedAt: pulled.updatedAt })
      }
      readyToPushRef.current = true
    })()
    return () => {
      cancelled = true
    }
    // Mount-only: re-running this per key-change is unnecessary since these hooks are always called with a fixed key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push on every subsequent local change, debounced. Also fires once right
  // after adopting a server pull (setValue above) — a harmless redundant
  // push of a value the server already has, traded for not needing extra
  // state to distinguish "changed by the user" from "changed by adopting a pull."
  useEffect(() => {
    if (!readyToPushRef.current) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      const pushedAt = Date.now()
      void pushSync(syncPath, value, pushedAt).then((accepted) => {
        if (accepted) writeSyncMeta(key, { updatedAt: pushedAt })
      })
    }, PUSH_DEBOUNCE_MS)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return [value, setValue]
}
