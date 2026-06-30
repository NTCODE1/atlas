import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { sleep, computeSleepScore } from '../data'
import { fetchHealthData, fallbackHealthData } from './healthData'
import { mapHealthData, type HealthData as MappedHealth } from './healthMapper'

interface HealthContextValue {
  /** Mapped health values; each field is null when that metric isn't live. */
  health: MappedHealth
  /** True when the data came from the API, false when running on bundled fallback. */
  isLive: boolean
  /** True until the initial fetch resolves. */
  loading: boolean
}

const HealthContext = createContext<HealthContextValue>({
  health: mapHealthData(null),
  isLive: false,
  loading: true,
})

/**
 * Fetches health data once on mount, maps it, and shares it with every screen.
 * `fetchHealthData()` returns the exact `fallbackHealthData` reference when it
 * falls back, so we detect live data by identity rather than re-fetching.
 */
export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthContextValue>({
    health: mapHealthData(null),
    isLive: false,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    fetchHealthData().then((raw) => {
      if (cancelled) return
      setState({
        health: mapHealthData(raw),
        isLive: raw !== fallbackHealthData,
        loading: false,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <HealthContext.Provider value={state}>{children}</HealthContext.Provider>
}

/** Read the shared health data, live flag, and loading state. */
export function useHealth(): HealthContextValue {
  return useContext(HealthContext)
}

/**
 * The single sleep score, computed from live stage minutes with per-field
 * fallback to the bundled `sleep` data. Used by both the Sleep ring and the
 * readiness formula so there's exactly one sleep score.
 */
export function sleepScoreFromHealth(health: MappedHealth): number {
  return computeSleepScore({
    totalMinutes: health.sleepTotalMinutes ?? sleep.totalMinutes,
    deepMinutes: health.sleepDeepMinutes ?? sleep.deepMinutes,
    remMinutes: health.sleepRemMinutes ?? sleep.remMinutes,
  })
}
