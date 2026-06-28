import type { CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

interface ReadinessRingProps {
  score: number
  label: string
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
export default function ReadinessRing({ score, label }: ReadinessRingProps) {
  const count = useCountUp(score, 1200)
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
            <stop offset="0%" stopColor="#2E5BFF" />
            <stop offset="100%" stopColor="#5B82FF" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
        />

        {/* Mint arc — glow comes from the CSS drop-shadow on .ring-arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          className="ring-arc"
          style={
            {
              '--target-offset': `${targetOffset}px`,
              '--circ': `${CIRC}px`,
            } as CSSProperties
          }
        />
      </svg>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num-glow font-display text-[68px] font-bold leading-none text-text">
          {count}
        </span>
        <span className="mt-2 font-display text-sm font-semibold tracking-[0.32em] text-accent">
          {label}
        </span>
      </div>
    </div>
  )
}
