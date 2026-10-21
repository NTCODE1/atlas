import { useCountUp } from '../../hooks/useCountUp'
import Ring from '../ui/Ring'

interface ReadinessRingProps {
  score: number
  label: string
  /** True until the health fetch resolves — shows an empty ring instead of a
   *  score computed from zeroed placeholder data (which would read as a false
   *  "very poor" score for a moment on every cold load). */
  loading?: boolean
}

/** Today's hero readiness ring; the centre number counts up to the score. */
export default function ReadinessRing({ score, label, loading }: ReadinessRingProps) {
  const count = useCountUp(loading ? 0 : score, 1200)
  return (
    <div className="mx-auto w-[200px]">
      <Ring progress={score / 100} size={200} stroke={13} loading={loading} glow>
        <span className="num-glow text-[64px] font-semibold leading-none tracking-tight text-text tabular-nums">
          {loading ? '–' : count}
        </span>
        <span className="mt-1.5 text-[15px] text-text-muted">{loading ? 'Loading' : label}</span>
      </Ring>
    </div>
  )
}
