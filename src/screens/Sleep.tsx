import { formatDuration, formatToday, sleep, sleepStages } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import Hypnogram from '../components/sleep/Hypnogram'
import SleepStat from '../components/sleep/SleepStat'

export default function Sleep() {
  const score = useCountUp(sleep.score)

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Sleep</h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Hero — last night's total + score */}
      <div className="mt-4 rounded-3xl border border-border bg-surface px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">LAST NIGHT</span>
        <div className="mt-1 flex items-end justify-between">
          <span className="font-display text-[44px] font-bold leading-none text-text">
            {formatDuration(sleep.totalMinutes)}
          </span>
          <div className="flex items-baseline gap-1 pb-1">
            <span className="font-display text-3xl font-bold leading-none text-mint">{score}</span>
            <span className="text-sm text-text-muted">score</span>
          </div>
        </div>
      </div>

      {/* Hypnogram */}
      <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-4">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">SLEEP STAGES</span>
        <div className="mt-3">
          <Hypnogram segments={sleepStages} />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-4 flex gap-2">
        <SleepStat label="DEEP" value={formatDuration(sleep.deepMinutes)} />
        <SleepStat label="REM" value={formatDuration(sleep.remMinutes)} />
        <SleepStat label="AWAKE" value={formatDuration(sleep.awakeMinutes)} />
        <SleepStat label="LOW HR" value={sleep.lowestRestingHr} unit="bpm" />
      </div>
    </div>
  )
}
