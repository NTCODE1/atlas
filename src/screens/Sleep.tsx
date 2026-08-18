import { Heart } from 'lucide-react'
import { formatSleepStat, sleep, computeSleepBalance } from '../data'
import { useHealth } from '../api/healthContext'
import { useReadiness } from '../hooks/useReadiness'
import SleepStageBar from '../components/sleep/SleepStageBar'
import SleepStat from '../components/sleep/SleepStat'
import SleepScoreRing from '../components/sleep/SleepScoreRing'
import SleepBalanceCard from '../components/sleep/SleepBalanceCard'
import BedtimeCard from '../components/sleep/BedtimeCard'

export default function Sleep() {
  const { health, loading } = useHealth()

  // Live sleep values, falling back to hard-coded data.ts values per field.
  const totalMin = health.sleepTotalMinutes ?? sleep.totalMinutes
  const deepMin = health.sleepDeepMinutes ?? sleep.deepMinutes
  const remMin = health.sleepRemMinutes ?? sleep.remMinutes
  const awakeMin = health.sleepAwakeMinutes ?? sleep.awakeMinutes
  // Derive Core so the four stages fill the bar and stay consistent with the tiles.
  const coreMin = Math.max(0, totalMin - deepMin - remMin - awakeMin)
  const lowHr = Math.round(health.restingHeartRate ?? sleep.lowestRestingHr)
  const { sleepScore, sleepLabel } = useReadiness()

  // Clock times, local "HH:MM", each falling back independently to data.ts.
  const asleepAt = health.sleepStart ?? sleep.sleepStart
  const awakeAt = health.sleepEnd ?? sleep.sleepEnd
  const inBedStart = health.inBedStart ?? sleep.bedtime
  const inBedEnd = health.inBedEnd ?? sleep.wakeTime

  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  // Stage percentages relative to the (live or fallback) total sleep.
  const pct = (minutes: number) => (totalMin > 0 ? Math.round((minutes / totalMin) * 100) : 0)
  const balanceVerdict = computeSleepBalance(deepMin, remMin, totalMin)

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Sleep</h1>
        <p className="mt-0.5 text-text-muted">Last night</p>
      </div>

      {/* Hero card: total + score ring, hypnogram, stat tiles */}
      <div className="card-grad-glass mt-4 rounded-3xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="num-glow font-display text-[48px] font-bold leading-none text-text">
                {hours}
              </span>
              <span className="font-display text-2xl font-bold text-text-muted">h</span>
              <span className="num-glow ml-1.5 font-display text-[48px] font-bold leading-none text-text">
                {mins}
              </span>
              <span className="font-display text-2xl font-bold text-text-muted">m</span>
            </div>
            <span className="mt-2 block text-[11px] font-semibold tracking-[0.2em] text-indigo">
              TOTAL SLEEP
            </span>
          </div>

          <SleepScoreRing score={sleepScore} label={sleepLabel} loading={loading} />
        </div>

        {/* Sleep-stage proportions (summary — HAE gives daily totals, not a timeline) */}
        <div className="mt-5 border-t border-border pt-4">
          <SleepStageBar
            deepMin={deepMin}
            coreMin={coreMin}
            remMin={remMin}
            awakeMin={awakeMin}
            totalMin={totalMin}
          />
        </div>

        {/* Stat tiles */}
        <div className="mt-4 flex gap-2">
          <SleepStat
            value={formatSleepStat(deepMin)}
            name="Deep"
            percent={pct(deepMin)}
            accent="indigo"
          />
          <SleepStat
            value={formatSleepStat(remMin)}
            name="REM"
            percent={pct(remMin)}
            accent="indigo"
          />
          <SleepStat
            value={String(awakeMin)}
            unit="m"
            name="Awake"
            percent={pct(awakeMin)}
            accent="rose"
          />
          <SleepStat
            value={String(lowHr)}
            unit="bpm"
            name="Low HR"
            icon={<Heart size={13} strokeWidth={2} className="text-rose" />}
          />
        </div>

        {/* Asleep → Awake clock times (local) */}
        <div className="mt-3 text-center text-xs text-text-muted">
          Asleep <span className="font-medium text-text">{asleepAt}</span> → Awake{' '}
          <span className="font-medium text-text">{awakeAt}</span>
        </div>
      </div>

      {/* Sleep balance verdict */}
      <div className="mt-4">
        <SleepBalanceCard verdict={balanceVerdict} />
      </div>

      {/* Bedtime / wake time */}
      <div className="mt-4">
        <BedtimeCard bedtime={inBedStart} wakeTime={inBedEnd} />
      </div>
    </div>
  )
}
