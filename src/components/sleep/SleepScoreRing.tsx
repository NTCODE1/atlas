import { useCountUp } from '../../hooks/useCountUp'
import Ring from '../ui/Ring'

interface SleepScoreRingProps {
  score: number
  /** Bucket label, e.g. "Excellent"/"Good"/"Fair"/"Poor" (see sleepScoreLabel in data.ts). */
  label?: string
  /** True until the health fetch resolves — see ReadinessRing for why. */
  loading?: boolean
}

/** Compact sleep-score ring for the Sleep hero card. */
export default function SleepScoreRing({ score, label, loading }: SleepScoreRingProps) {
  const count = useCountUp(loading ? 0 : score, 1200)
  return (
    <div className="w-[104px] shrink-0">
      <Ring progress={score / 100} size={104} stroke={9} loading={loading}>
        <span className="num-glow text-[30px] font-semibold leading-none text-text tabular-nums">
          {loading ? '–' : count}
        </span>
        <span className="mt-1 text-[9.5px] font-medium tracking-[0.2em] text-text-muted">
          {loading ? 'LOADING' : label ? label.toUpperCase() : 'SCORE'}
        </span>
      </Ring>
    </div>
  )
}
