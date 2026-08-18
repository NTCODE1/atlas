import type { CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

interface ReadinessRingProps {
  score: number
  label: string
  /** True until the health fetch resolves — shows an empty ring instead of a
   *  score computed from zeroed placeholder data (which would read as a false
   *  "very poor" score for a moment on every cold load). */
  loading?: boolean
}

const SIZE = 240
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Large circular readiness donut. A faint full-circle track sits behind a accent
 * progress arc that sweeps in on load (CSS keyframe on stroke-dashoffset); the
 * centre number counts up to the score. The glow is a shape-aware CSS
 * drop-shadow on the arc itself — it hugs the stroke (no boxy filter region)
 * and is GPU-accelerated, so it doesn't trail the arc during the sweep.
 */
export default function ReadinessRing({ score, label, loading }: ReadinessRingProps) {
  const count = useCountUp(loading ? 0 : score, 1200)
  const targetOffset = CIRC * (1 - score / 100)

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90 overflow-visible"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-sky)" />
            <stop offset="100%" stopColor="var(--color-accent-bright)" />
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

        {/* Progress arc — glow comes from the CSS drop-shadow on .ring-arc.
            While loading, stay fully unfilled instead of sweeping to a score
            computed from placeholder zeros. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ring-grad)"
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
        <span className="num-glow font-display text-[68px] font-bold leading-none text-text">
          {loading ? '–' : count}
        </span>
        <span className="mt-2 font-display text-sm font-semibold tracking-[0.32em] text-accent">
          {loading ? 'LOADING' : label}
        </span>
      </div>
    </div>
  )
}
