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
 * Large circular readiness donut. A faint full-circle track sits behind a mint
 * progress arc that sweeps in on load (CSS keyframe on stroke-dashoffset); the
 * centre number counts up to the score. A blurred duplicate arc adds the glow.
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
        className="-rotate-90"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2BD9AE" />
            <stop offset="100%" stopColor="#5BFFD6" />
          </linearGradient>
          <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
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

        {/* Glow (blurred duplicate of the arc) */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          filter="url(#ring-glow)"
          opacity={0.7}
          className="ring-arc"
          style={
            {
              '--target-offset': `${targetOffset}px`,
              '--circ': `${CIRC}px`,
            } as CSSProperties
          }
        />

        {/* Crisp arc */}
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
        <span className="font-display text-[68px] font-bold leading-none text-text">
          {count}
        </span>
        <span className="mt-2 font-display text-sm font-semibold tracking-[0.32em] text-mint">
          {label}
        </span>
      </div>
    </div>
  )
}
