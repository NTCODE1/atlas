import type { CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

interface SleepScoreRingProps {
  score: number
}

const SIZE = 116
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Compact indigo score donut. Mirrors ReadinessRing but smaller and in indigo:
 * reuses the shared `.ring-arc` sweep animation, overriding its (mint) glow
 * with an inline indigo drop-shadow so no global CSS change is needed.
 */
export default function SleepScoreRing({ score }: SleepScoreRingProps) {
  const count = useCountUp(score, 1200)
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
            <stop offset="0%" stopColor="#8a93ff" />
            <stop offset="100%" stopColor="#b3a8ff" />
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

        {/* Indigo progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#sleep-ring-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          className="ring-arc"
          style={
            {
              '--target-offset': `${targetOffset}px`,
              '--circ': `${CIRC}px`,
              filter:
                'drop-shadow(0 0 4px rgba(138,147,255,0.55)) drop-shadow(0 0 10px rgba(138,147,255,0.35))',
            } as CSSProperties
          }
        />
      </svg>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[34px] font-bold leading-none text-text">{count}</span>
        <span className="mt-1 font-display text-[10px] font-semibold tracking-[0.32em] text-indigo">
          SCORE
        </span>
      </div>
    </div>
  )
}
