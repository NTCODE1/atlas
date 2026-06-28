import { Heart } from 'lucide-react'
import { formatSleepStat, sleep, sleepStages } from '../data'
import Hypnogram from '../components/sleep/Hypnogram'
import SleepStat from '../components/sleep/SleepStat'
import SleepScoreRing from '../components/sleep/SleepScoreRing'
import SleepBalanceCard from '../components/sleep/SleepBalanceCard'
import BedtimeCard from '../components/sleep/BedtimeCard'

const pct = (minutes: number) => Math.round((minutes / sleep.totalMinutes) * 100)

export default function Sleep() {
  const hours = Math.floor(sleep.totalMinutes / 60)
  const mins = sleep.totalMinutes % 60

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Sleep</h1>
        <p className="mt-0.5 text-text-muted">Last night</p>
      </div>

      {/* Hero card: total + score ring, hypnogram, stat tiles */}
      <div className="card-grad mt-4 rounded-3xl border border-border bg-surface px-5 py-5">
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

          <SleepScoreRing score={sleep.score} />
        </div>

        {/* Hypnogram */}
        <div className="mt-5 border-t border-border pt-4">
          <Hypnogram segments={sleepStages} />
        </div>

        {/* Stat tiles */}
        <div className="mt-4 flex gap-2">
          <SleepStat
            value={formatSleepStat(sleep.deepMinutes)}
            name="Deep"
            percent={pct(sleep.deepMinutes)}
            accent="indigo"
          />
          <SleepStat
            value={formatSleepStat(sleep.remMinutes)}
            name="REM"
            percent={pct(sleep.remMinutes)}
            accent="indigo"
          />
          <SleepStat
            value={formatSleepStat(sleep.awakeMinutes)}
            unit="m"
            name="Awake"
            percent={pct(sleep.awakeMinutes)}
            accent="rose"
          />
          <SleepStat
            value={String(sleep.lowestRestingHr)}
            unit="bpm"
            name="Low HR"
            icon={<Heart size={13} strokeWidth={2} className="text-rose" />}
          />
        </div>
      </div>

      {/* Sleep balance verdict */}
      <div className="mt-4">
        <SleepBalanceCard />
      </div>

      {/* Bedtime / wake time */}
      <div className="mt-4">
        <BedtimeCard />
      </div>
    </div>
  )
}
