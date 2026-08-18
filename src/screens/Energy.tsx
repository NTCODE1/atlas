import { useEffect } from 'react'
import {
  caffeine,
  caffeineClearsAt,
  caffeineLevelAt,
  hoursToTime,
  initialCaffeineDoses,
  type CaffeineDose,
} from '../caffeine'
import { activity, formatToday, hydration } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useHealth } from '../api/healthContext'
import { useReadiness } from '../hooks/useReadiness'
import { DEFAULT_FASTING, elapsedHours, type FastingState } from '../fasting'
import { pruneByDate } from '../dataRetention'
import { todayISO } from '../workouts'
import CaffeineChart from '../components/energy/CaffeineChart'
import EnergyForecastCard from '../components/energy/EnergyForecastCard'
import DoseList from '../components/energy/DoseList'

function currentHour(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

export default function Energy() {
  const { health } = useHealth()
  // Persisted so logged caffeine survives navigation and drives the forecast.
  const [doses, setDoses] = useLocalStorage<CaffeineDose[]>(
    'atlas.caffeine.doses',
    initialCaffeineDoses,
  )
  // Read-only here: fasting is owned by the Nutrition FastingCard.
  const [fasting] = useLocalStorage<FastingState>('atlas.fasting', DEFAULT_FASTING)

  // Doses are a short daily log (the decay curve/forecast only make sense for
  // today) — drop entries older than 7 days rather than keeping them forever.
  useEffect(() => {
    setDoses((prev) => pruneByDate(prev, todayISO()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const todayDoses = doses.filter((d) => d.date === todayISO())
  const nowHour = currentHour()
  const { sleepScore, recoveryScore, activityScore } = useReadiness()

  const hydrationLitres = health.hydrationLitres ?? Number(hydration.value)

  // Forecast inputs: live health with per-field fallback to bundled data, plus
  // the shared readiness sub-scores (recovery/activity) from useReadiness().
  const forecastInputs = {
    sleepScore,
    recoveryScore,
    activityScore,
    steps: health.steps ?? activity.steps,
    activeKcal: Math.round(health.activeEnergyKcal ?? activity.activeKcal),
    fastingHours: elapsedHours(fasting),
    hydrationRatio: hydrationLitres / hydration.goalLitres,
  }
  // Caffeine in system right now: the decay curve summed across today's logged doses.
  const level = Math.round(caffeineLevelAt(todayDoses, nowHour))
  const animatedLevel = useCountUp(level)

  const clearHour = caffeineClearsAt(todayDoses)
  const clearsAt = level < caffeine.clearThresholdMg || clearHour === null
    ? null
    : hoursToTime(clearHour)

  const addDose = (dose: Omit<CaffeineDose, 'id' | 'date'>) => {
    setDoses((prev) => [...prev, { ...dose, id: `d-${Date.now()}`, date: todayISO() }])
  }

  const updateDose = (dose: CaffeineDose) => {
    setDoses((prev) => prev.map((d) => (d.id === dose.id ? dose : d)))
  }

  const deleteDose = (id: string) => {
    setDoses((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Energy</h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Hero — caffeine in system */}
      <div className="card-grad-glass mt-4 rounded-3xl px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          CAFFEINE IN SYSTEM
        </span>
        <div className="mt-1 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="num-glow font-display text-[56px] font-bold leading-none text-accent">
              {animatedLevel}
            </span>
            <span className="text-lg text-text-muted">mg</span>
          </div>
          <div className="pb-1 text-right">
            {clearsAt ? (
              <>
                <p className="text-xs text-text-muted">clears at</p>
                <p className="font-display text-lg font-semibold text-text">{clearsAt}</p>
              </>
            ) : (
              <p className="font-display text-lg font-semibold text-accent">clear</p>
            )}
          </div>
        </div>
      </div>

      {/* Energy forecast */}
      <EnergyForecastCard doses={todayDoses} nowHour={nowHour} {...forecastInputs} />

      {/* Caffeine chart */}
      <div className="glass mt-4 rounded-2xl px-4 py-4">
        <CaffeineChart doses={todayDoses} nowHour={nowHour} />
      </div>

      {/* Doses */}
      <div className="mt-4">
        <DoseList
          doses={todayDoses}
          onAdd={addDose}
          onUpdate={updateDose}
          onDelete={deleteDose}
        />
      </div>
    </div>
  )
}
