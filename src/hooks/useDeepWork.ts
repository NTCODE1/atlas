import { useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayISO } from '../workouts'
import { activeMinutes, totalMinutesFor, DEFAULT_DEEP_WORK, type DeepWorkState } from '../deepWork'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Tap-to-toggle deep-work timer, mirroring useFasting's tick pattern. Sessions
 * accumulate per day rather than tracking one continuous window, since deep
 * work happens in bursts (a session, a break, another session).
 */
export function useDeepWork() {
  const [state, setState] = useLocalStorage<DeepWorkState>('atlas.deepwork', DEFAULT_DEEP_WORK)
  const [now, setNow] = useState(Date.now())

  // Tick while a session is running so the elapsed time and progress advance.
  useEffect(() => {
    if (!state.active) return
    const period = prefersReducedMotion() ? 60_000 : 1000
    const id = setInterval(() => setNow(Date.now()), period)
    return () => clearInterval(id)
  }, [state.active])

  const start = () => setState((s) => ({ ...s, active: true, startMs: Date.now() }))

  const stop = () =>
    setState((s) => {
      if (!s.active || s.startMs == null) return { ...s, active: false, startMs: null }
      const minutes = Math.round(activeMinutes(s, Date.now()))
      // Ignore accidental sub-minute taps — no session worth logging.
      if (minutes < 1) return { ...s, active: false, startMs: null }
      return {
        ...s,
        active: false,
        startMs: null,
        sessions: [...s.sessions, { id: `dw-${Date.now()}`, date: todayISO(), minutes }],
      }
    })

  return {
    active: state.active,
    activeMinutes: activeMinutes(state, now),
    todayMinutes: totalMinutesFor(state, todayISO(), now),
    start,
    stop,
  }
}
