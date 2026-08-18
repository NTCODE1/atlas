import { useId, type CSSProperties } from 'react'

interface Vo2MaxRingProps {
  value: number
  /** 0–100 fill position within the age/sex fitness scale (see vo2max.ts). */
  percent: number
}

const SIZE = 88
const STROKE = 9
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/**
 * Small ring gauge for the VO2 max card — same sweep-in arc as the Home
 * readiness ring (shares its `.ring-arc` keyframe/gradient styling), just
 * scaled down and driven by a fitness-tier percent instead of a 0–100 score.
 * The centre shows the raw reading, not the gauge percent.
 */
export default function Vo2MaxRing({ value, percent }: Vo2MaxRingProps) {
  const gradId = useId()
  const clamped = Math.max(0, Math.min(100, percent))
  const targetOffset = CIRC * (1 - clamped / 100)

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90 overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-sky)" />
            <stop offset="100%" stopColor="var(--color-accent-bright)" />
          </linearGradient>
        </defs>

        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-fill)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          className="ring-arc"
          style={{ '--target-offset': `${targetOffset}px`, '--circ': `${CIRC}px` } as CSSProperties}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold text-text">{value.toFixed(1)}</span>
      </div>
    </div>
  )
}
