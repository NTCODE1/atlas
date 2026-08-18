import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchHealthData, fallbackHealthData } from './healthData'
import { mapHealthData, mapMetricSeries, type HealthData as MappedHealth, type MetricPoint } from './healthMapper'

/** HAE has exported VO2 max under both names depending on version/source. */
const VO2_MAX_METRIC_NAMES = ['vo2_max', 'cardio_fitness']

interface HealthContextValue {
  /** Mapped health values; each field is null when that metric isn't live. */
  health: MappedHealth
  /** VO2 max readings over time, oldest first — for the Training Cardio tab trend. */
  vo2MaxSeries: MetricPoint[]
  /** True when the data came from the API, false when running on bundled fallback. */
  isLive: boolean
  /** True until the initial fetch resolves. */
  loading: boolean
}

const HealthContext = createContext<HealthContextValue>({
  health: mapHealthData(null),
  vo2MaxSeries: [],
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
    vo2MaxSeries: [],
    isLive: false,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    fetchHealthData().then((raw) => {
      if (cancelled) return
      setState({
        health: mapHealthData(raw),
        vo2MaxSeries: mapMetricSeries(raw, VO2_MAX_METRIC_NAMES),
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
