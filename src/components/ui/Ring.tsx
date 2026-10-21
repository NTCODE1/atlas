import type { CSSProperties, ReactNode } from 'react'

interface RingProps {
  /** 0–1; clamped. */
  progress: number
  /** Outer diameter in px (the ring scales down to fit narrower parents). */
  size: number
  stroke: number
  /** True until data resolves — draws an empty track instead of sweeping to a
   *  value computed from placeholder zeros. */
  loading?: boolean
  /** Centre content (number, label). */
  children?: ReactNode
}

/**
 * The one ring style used everywhere (readiness, sleep score, macros): a white
 * glowing arc on a dark track, sweeping in on load via the shared `.ring-arc`
 * keyframe in index.css. Replaces the per-screen ring components, which had
 * drifted apart in stroke, colour and glow.
 */
export default function Ring({ progress, size, stroke, loading, children }: RingProps) {
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, progress))
  const targetOffset = circ * (1 - pct)

  return (
    // w-full + aspect-square lets the ring shrink in tight rows; maxWidth caps it.
    <div className="relative aspect-square w-full shrink-0" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent-bright)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={loading ? circ : undefined}
          className={loading || pct === 0 ? '' : 'ring-arc'}
          style={
            loading
              ? undefined
              : ({ '--target-offset': `${targetOffset}px`, '--circ': `${circ}px` } as CSSProperties)
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
