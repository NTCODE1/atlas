import { user, formatToday, readiness, stats, computeReadiness } from '../data'
import { useHealth } from '../api/healthContext'
import ReadinessRing from '../components/home/ReadinessRing'
import StatTile from '../components/home/StatTile'
import FocusCard from '../components/home/FocusCard'
import ProgressTile from '../components/home/ProgressTile'
import WaterCard from '../components/WaterCard'
import MoodCard from '../components/home/MoodCard'

export default function Home() {
  const { health } = useHealth()

  // Per-tile live overrides; keep spark/trend from the hard-coded stats.
  const liveStats = stats.map((stat) => {
    if (stat.label === 'SLEEP' && health.sleepHours != null) {
      return { ...stat, value: String(health.sleepHours), value2: String(health.sleepMinutes ?? 0) }
    }
    if (stat.label === 'HRV' && health.hrv != null) {
      return { ...stat, value: String(Math.round(health.hrv)) }
    }
    if (stat.label === 'CAFFEINE' && health.caffeineMg != null) {
      return { ...stat, value: String(Math.round(health.caffeineMg)) }
    }
    return stat
  })

  // Recalculate readiness only when all four live inputs are present.
  const ringScore =
    health.hrv != null &&
    health.sleepTotalMinutes != null &&
    health.restingHeartRate != null &&
    health.caffeineMg != null
      ? computeReadiness({
          hrv: health.hrv,
          sleepMinutes: health.sleepTotalMinutes,
          restingHr: health.restingHeartRate,
          caffeineMg: health.caffeineMg,
        })
      : readiness.score

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">
          {user.greeting}, {user.name}
        </h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Readiness ring */}
      <div className="card-grad mt-4 rounded-3xl border border-border bg-surface px-4 py-6">
        <ReadinessRing score={ringScore} label={readiness.label} />
        <p className="mx-auto mt-5 max-w-[18rem] text-center text-sm leading-relaxed text-text-muted">
          {readiness.verdict}
        </p>

        {/* Three stat tiles */}
        <div className="mt-5 flex gap-2.5">
          {liveStats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      {/* Today's Focus */}
      <div className="mt-4">
        <FocusCard />
      </div>

      {/* Deep Work + Hydration */}
      <div className="mt-4 flex gap-3">
        <ProgressTile />
        <WaterCard compact />
      </div>

      {/* Current Mood */}
      <div className="mt-4">
        <MoodCard />
      </div>
    </div>
  )
}
