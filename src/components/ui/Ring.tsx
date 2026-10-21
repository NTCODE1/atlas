import { useId, type CSSProperties, type ReactNode } from 'react'

interface RingProps {
  /** 0–1; clamped. */
  progress: number
  /** Outer diameter in px (the ring scales down to fit narrower parents). */
  size: number
  stroke: number
  /** True until data resolves — draws an empty track instead of sweeping to a
   *  value computed from placeholder zeros. */
  loading?: boolean
  /** Hero treatment: a soft halo behind the ring, a stronger arc glow and a
   *  glowing tip where the arc ends. Used for Today's readiness ring. */
  glow?: boolean
  /** Centre content (number, label). */
  children?: ReactNode
}

/**
 * The one ring style used everywhere (readiness, sleep score, macros): a white
 * glowing arc on a dark track, sweeping in on load via the shared `.ring-arc`
 * keyframe in index.css. Replaces the per-screen ring components, which had
 * drifted apart in stroke, colour and glow.
 */
export default function Ring({ progress, size, stroke, loading, glow, children }: RingProps) {
  // useId's ":r0:"-style ids aren't safe inside an SVG url(#…) reference.
  const gradId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, progress))
  const targetOffset = circ * (1 - pct)
  const showArc = !loading && pct > 0

  // Arc tip position. The SVG is rotated -90°, so angle 0 is the top of the ring.
  const angle = pct * 2 * Math.PI
  const tipX = size / 2 + radius * Math.cos(angle)
  const tipY = size / 2 + radius * Math.sin(angle)

  return (
    // w-full + aspect-square lets the ring shrink in tight rows; maxWidth caps it.
    <div className="relative aspect-square w-full shrink-0" style={{ maxWidth: size }}>
      {glow && <div aria-hidden className="ring-halo pointer-events-none absolute -inset-[18%] rounded-full" />}
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90 overflow-visible">
        <defs>
          {/* Bright where the arc starts, a touch cooler where it ends — reads as lit metal. */}
          <linearGradient id={gradId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c4c6cc" />
          </linearGradient>
        </defs>
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
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={loading ? circ : undefined}
          className={showArc ? (glow ? 'ring-arc ring-arc-strong' : 'ring-arc') : ''}
          style={
            loading
              ? undefined
              : ({ '--target-offset': `${targetOffset}px`, '--circ': `${circ}px` } as CSSProperties)
          }
        />
        {/* Glowing tip — fades in once the sweep has landed. */}
        {glow && showArc && pct < 1 && (
          <circle cx={tipX} cy={tipY} r={stroke * 0.32} fill="#ffffff" className="ring-tip" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
