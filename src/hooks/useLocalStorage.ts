import { useEffect, useState } from 'react'

/**
 * State persisted to localStorage. Lazily reads the stored JSON on mount
 * (falling back to `initial`), and writes back whenever the value changes.
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked — ignore, state still works in-session
    }
  }, [key, value])

  return [value, setValue]
}
