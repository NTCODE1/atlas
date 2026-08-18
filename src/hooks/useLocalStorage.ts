import { useEffect, useState } from 'react'

/** Same-tab broadcast channel prefix — keeps all hooks on a key in sync. */
const syncEvent = (key: string) => `atlas-ls:${key}`

/**
 * Write a value to localStorage from outside a hook and broadcast the same-tab
 * sync event, so any mounted useLocalStorage on this key adopts it immediately.
 * Mirrors the persist effect below; used by non-hook writers (e.g. adding
 * journal entries across arbitrary dates). Silently no-ops if storage is blocked.
 */
export function writeLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    const raw = JSON.stringify(value)
    window.localStorage.setItem(key, raw)
    window.dispatchEvent(new CustomEvent(syncEvent(key), { detail: raw }))
  } catch {
    // storage full or blocked — ignore
  }
}

/**
 * State persisted to localStorage. Lazily reads the stored JSON on mount
 * (falling back to `initial`), writes back whenever the value changes, and —
 * unlike a bare useState — keeps every component using the same key in sync
 * within the tab (e.g. logging water in one card updates another instantly).
 * SSR-safe and resilient to malformed/blocked storage.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  // Persist on change and broadcast to sibling hooks on the same key.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = JSON.stringify(value)
      window.localStorage.setItem(key, raw)
      window.dispatchEvent(new CustomEvent(syncEvent(key), { detail: raw }))
    } catch {
      // storage full or blocked — ignore, state still works in-session
    }
  }, [key, value])

  // Adopt updates from other instances of this key (same tab) and other tabs.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const adopt = (raw: string | null) => {
      if (raw === null) return
      try {
        setValue((cur) => (JSON.stringify(cur) === raw ? cur : (JSON.parse(raw) as T)))
      } catch {
        // ignore malformed payloads
      }
    }
    const onSameTab = (e: Event) => adopt((e as CustomEvent<string>).detail)
    const onCrossTab = (e: StorageEvent) => {
      if (e.key === key) adopt(e.newValue)
    }
    window.addEventListener(syncEvent(key), onSameTab)
    window.addEventListener('storage', onCrossTab)
    return () => {
      window.removeEventListener(syncEvent(key), onSameTab)
      window.removeEventListener('storage', onCrossTab)
    }
  }, [key])

  return [value, setValue]
}
