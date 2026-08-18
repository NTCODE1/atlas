import { useState } from 'react'
import { Footprints, Flame, Heart, Scale } from 'lucide-react'
import { user, formatToday, stats, activity, readinessVerdict, type Stat } from '../data'
import { useHealth } from '../api/healthContext'
import { useReadiness } from '../hooks/useReadiness'
import { useSettings } from '../settingsContext'
import ReadinessRing from '../components/home/ReadinessRing'
import StatTile from '../components/home/StatTile'
import MetricTile from '../components/home/MetricTile'
import FocusCard from '../components/home/FocusCard'
import ProgressTile from '../components/home/ProgressTile'
import WaterCard from '../components/WaterCard'
import BriefingCard from '../components/home/BriefingCard'
import WeightSheet from '../components/home/WeightSheet'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { kgToDisplay } from '../settings'
import { latestEntry, type WeightEntry } from '../weightLog'
import { snapshotList, cutoffDateISO, type SnapshotStore, type DailySnapshot } from '../dailySnapshot'
import { todayISO } from '../workouts'
import type { CaffeineDose } from '../caffeine'

/** Real day-over-day % change from `prior` to `today`, or undefined if either
 *  is missing (no fabricated trend when there's nothing to compare against). */
function pctTrend(
  today: number | null | undefined,
  prior: number | null | undefined,
): { trend: string; trendDir: 'up' | 'down' } | undefined {
  if (today == null || prior == null || prior === 0) return undefined
  const pct = Math.round(((today - prior) / prior) * 100)
  return { trend: `${Math.abs(pct)}%`, trendDir: pct >= 0 ? 'up' : 'down' }
}

export default function Home() {
  const { health, loading } = useHealth()
  const { settings } = useSettings()
  const [weightEntries, setWeightEntries] = useLocalStorage<WeightEntry[]>(
    'atlas.weight.entries',
    [],
  )
  const [snapshots] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})
  // Read-only here: doses are owned by the Energy screen. health.caffeineMg is
  // a different, unused Apple Health metric — this is what's actually logged.
  const [caffeineDoses] = useLocalStorage<CaffeineDose[]>('atlas.caffeine.doses', [])
  const [weightOpen, setWeightOpen] = useState(false)
  const latestWeight = latestEntry(weightEntries)
  // Prefer the live scale weight (Apple Health) when present; else the manual log.
  const displayWeightKg = health.weightKg ?? latestWeight?.kg ?? null

  const today = todayISO()
  const yesterday = todayISO(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const yesterdaySnap = snapshots[yesterday]
  const todayCaffeineMg = caffeineDoses
    .filter((d) => d.date === today)
    .reduce((sum, d) => sum + (d.mg ?? 0), 0)
  // Up to 6 days of real history BEFORE today, oldest first — today's own point
  // is appended live (below) so it's never a render behind the displayed value.
  const pastDays = snapshotList(snapshots).filter((s) => s.date < today && s.date >= cutoffDateISO(today, 6))
  const pastSpark = (field: keyof DailySnapshot): number[] =>
    pastDays.map((s) => s[field]).filter((v): v is number => typeof v === 'number')

  // Per-tile live overrides. Trend/spark are computed from real history
  // (atlas.snapshots) — no data yet means no trend/spark, not a fake one.
  const liveStats = stats.map((stat): Stat => {
    if (stat.label === 'SLEEP' && health.sleepHours != null) {
      const trend = pctTrend(health.sleepTotalMinutes, yesterdaySnap?.sleepTotalMinutes)
      const spark = pastSpark('sleepTotalMinutes')
      if (health.sleepTotalMinutes != null) spark.push(health.sleepTotalMinutes)
      return {
        ...stat,
        value: String(health.sleepHours),
        value2: String(health.sleepMinutes ?? 0),
        trend: trend?.trend,
        trendDir: trend?.trendDir,
        sub: trend ? undefined : 'no data yet',
        spark,
      }
    }
    if (stat.label === 'HRV' && health.hrv != null) {
      const trend = pctTrend(health.hrv, yesterdaySnap?.hrv)
      const spark = pastSpark('hrv')
      spark.push(Math.round(health.hrv))
      return {
        ...stat,
        value: String(Math.round(health.hrv)),
        trend: trend?.trend,
        trendDir: trend?.trendDir,
        sub: trend ? undefined : 'no data yet',
        spark,
      }
    }
    if (stat.label === 'CAFFEINE') {
      // Always live — 0mg is a real reading, not "missing data" like sleep/HRV.
      return {
        ...stat,
        value: String(Math.round(todayCaffeineMg)),
        spark: [...pastSpark('caffeineMg'), Math.round(todayCaffeineMg)],
      }
    }
    return stat
  })

  const { readiness: readinessResult, readinessLabel } = useReadiness()
  const ringScore = readinessResult.score
  const verdict = readinessVerdict(readinessResult)

  // Daily activity tiles — each field falls back independently to data.ts.
  const steps = Math.round(health.steps ?? activity.steps)
  const activeKcal = Math.round(health.activeEnergyKcal ?? activity.activeKcal)
  const avgHr = Math.round(health.averageHeartRate ?? activity.avgHeartRate)

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">
          {user.greeting}, {settings.name}
        </h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Readiness ring */}
      <div className="card-grad-glass mt-4 rounded-3xl px-4 py-6">
        <ReadinessRing score={ringScore} label={readinessLabel} loading={loading} />
        <p className="mx-auto mt-5 max-w-[18rem] text-center text-sm leading-relaxed text-text-muted">
          {loading ? 'Loading your data…' : verdict}
        </p>

        {/* Three stat tiles */}
        <div className="mt-5 flex gap-2.5">
          {liveStats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      {/* Daily activity + body weight */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 min-[400px]:grid-cols-4">
        <MetricTile icon={<Footprints size={15} />} label="STEPS" value={steps.toLocaleString()} />
        <MetricTile icon={<Flame size={15} />} label="ACTIVE" value={String(activeKcal)} unit="kcal" />
        <MetricTile icon={<Heart size={15} />} label="AVG HR" value={String(avgHr)} unit="bpm" />
        <button
          type="button"
          onClick={() => setWeightOpen(true)}
          aria-label="Body weight log"
          className="press h-full text-left [&>div]:h-full"
        >
          <MetricTile
            icon={<Scale size={15} />}
            label="WEIGHT"
            value={displayWeightKg != null ? String(kgToDisplay(displayWeightKg, settings.weightUnit)) : '—'}
            unit={displayWeightKg != null ? settings.weightUnit : undefined}
          />
        </button>
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

      {/* AI daily brief */}
      <div className="mt-4">
        <BriefingCard />
      </div>

      {weightOpen && (
        <WeightSheet
          entries={weightEntries}
          setEntries={setWeightEntries}
          onClose={() => setWeightOpen(false)}
        />
      )}
    </div>
  )
}
