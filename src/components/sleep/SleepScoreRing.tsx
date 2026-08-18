import type { CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

interface SleepScoreRingProps {
  score: number
  /** Bucket label, e.g. "Excellent"/"Good"/"Fair"/"Poor" (see sleepScoreLabel in data.ts). */
  label?: string
  /** True until the health fetch resolves — see ReadinessRing for why. */
  loading?: boolean
}

const SIZE = 116
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Compact score donut. Mirrors ReadinessRing but smaller, using the shared
 * `.ring-arc` sweep animation and glow.
 */
export default function SleepScoreRing({ score, label, loading }: SleepScoreRingProps) {
  const count = useCountUp(loading ? 0 : score, 1200)
  const targetOffset = CIRC * (1 - score / 100)

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90 overflow-visible"
      >
        <defs>
          <linearGradient id="sleep-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-cyan)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-fill)"
          strokeWidth={STROKE}
        />

        {/* Progress arc — stays fully unfilled while loading instead of
            sweeping to a score computed from placeholder zeros. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#sleep-ring-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={loading ? CIRC : undefined}
          className={loading ? '' : 'ring-arc'}
          style={
            loading
              ? undefined
              : ({
                  '--target-offset': `${targetOffset}px`,
                  '--circ': `${CIRC}px`,
                } as CSSProperties)
          }
        />
      </svg>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num-glow font-display text-[34px] font-bold leading-none text-text">
          {loading ? '–' : count}
        </span>
        <span className="mt-1 font-display text-[10px] font-semibold tracking-[0.32em] text-indigo">
          {loading ? 'LOADING' : label ? label.toUpperCase() : 'SCORE'}
        </span>
      </div>
    </div>
  )
}
